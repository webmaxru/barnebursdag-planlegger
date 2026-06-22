<#
Usage:
  pwsh -NoProfile -File ./scripts/insights.ps1 -Days 7
  powershell -ExecutionPolicy Bypass -File scripts\insights.ps1 -Days 7

Prints Kakeklar's key Azure Application Insights metrics in the terminal.
Cookieless analytics means session_Id/user_Id are ephemeral per page load, so
"Sessions" is approximately visits rather than durable returning users.
#>

[CmdletBinding()]
param(
    [int]$Days = 30,
    [string]$AppId,
    [string]$ResourceGroup = 'rg-barnebursdag',
    [string]$Component = 'kakeklar-insights'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$KnownAppId = '3bde82f6-27af-4d74-ab59-4e731ed42639'

function Test-AzLoginMessage {
    param([string]$Message)

    return $Message -match 'az login|login to your Azure account|not logged in|No subscriptions found|AADSTS|expired|Please run'
}

function Invoke-Az {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [switch]$Json
    )

    $output = & az @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String).Trim()

    if ($exitCode -ne 0) {
        throw "Azure CLI command failed (exit $exitCode): az $($Arguments -join ' ')`n$text"
    }

    if ($Json) {
        if ([string]::IsNullOrWhiteSpace($text)) {
            return $null
        }

        return $text | ConvertFrom-Json
    }

    return $text
}

function Initialize-AzApplicationInsights {
    if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
        throw 'Azure CLI (az) was not found on PATH. Install Azure CLI, then run az login.'
    }

    Invoke-Az -Arguments @('config', 'set', 'extension.use_dynamic_install=yes_without_prompt') | Out-Null

    & az extension show -n application-insights -o none 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Installing Azure CLI application-insights extension...' -ForegroundColor Yellow
        Invoke-Az -Arguments @('extension', 'add', '-n', 'application-insights', '--only-show-errors') | Out-Null
    }
}

function Resolve-AppInsightsAppId {
    if (-not [string]::IsNullOrWhiteSpace($AppId)) {
        return $AppId
    }

    try {
        $resolved = Invoke-Az -Arguments @(
            'monitor', 'app-insights', 'component', 'show',
            '--app', $Component,
            '-g', $ResourceGroup,
            '--query', 'appId',
            '-o', 'tsv',
            '--only-show-errors'
        )

        if (-not [string]::IsNullOrWhiteSpace($resolved)) {
            return $resolved
        }
    }
    catch {
        Write-Host "Could not resolve appId from component '$Component'; falling back to the known appId." -ForegroundColor Yellow
        Write-Host "Reason: $($_.Exception.Message)" -ForegroundColor DarkYellow
    }

    return $KnownAppId
}

function Convert-QueryRows {
    param($QueryResult)

    if ($null -eq $QueryResult -or $null -eq $QueryResult.tables -or @($QueryResult.tables).Count -eq 0) {
        return @()
    }

    $table = @($QueryResult.tables)[0]
    if ($null -eq $table.rows -or @($table.rows).Count -eq 0) {
        return @()
    }

    $columns = @($table.columns | ForEach-Object { $_.name })
    $rows = foreach ($row in @($table.rows)) {
        $object = [ordered]@{}
        for ($i = 0; $i -lt $columns.Count; $i++) {
            $value = $null
            if ($i -lt @($row).Count) {
                $value = @($row)[$i]
            }
            $object[$columns[$i]] = $value
        }
        [pscustomobject]$object
    }

    return @($rows)
}

function Invoke-AppInsightsQuery {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Kql
    )

    $result = Invoke-Az -Json -Arguments @(
        'monitor', 'app-insights', 'query',
        '--app', $script:ResolvedAppId,
        '--analytics-query', $Kql,
        '--offset', "$($Days)d",
        '-o', 'json',
        '--only-show-errors'
    )

    return @(Convert-QueryRows -QueryResult $result)
}

function Format-DateColumn {
    param([object[]]$Rows)

    $items = @($Rows | Where-Object { $null -ne $_ })
    foreach ($row in $items) {
        if ($row.PSObject.Properties.Name -contains 'timestamp' -and $null -ne $row.timestamp) {
            try {
                $row.timestamp = ([datetime]$row.timestamp).ToString('yyyy-MM-dd')
            }
            catch {
                # Keep the original value if Azure returns an unexpected timestamp shape.
            }
        }
    }

    return $items
}

function Write-SectionTitle {
    param([string]$Title)

    Write-Host ''
    Write-Host "== $Title ==" -ForegroundColor Cyan
}

function Write-DataTable {
    param([object[]]$Rows)

    $items = @($Rows | Where-Object { $null -ne $_ })
    if ($items.Count -eq 0) {
        Write-Host '  (no data yet)' -ForegroundColor DarkGray
        return
    }

    $tableText = $items | Format-Table -AutoSize -Wrap | Out-String -Width 160
    Write-Host ($tableText.TrimEnd())
}

try {
    Initialize-AzApplicationInsights
    $script:ResolvedAppId = Resolve-AppInsightsAppId

    $generatedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz')

    Write-Host ''
    Write-Host 'Kakeklar Application Insights metrics' -ForegroundColor Green
    Write-Host ('Component: {0} | Resource group: {1}' -f $Component, $ResourceGroup)
    Write-Host ('App ID: {0}' -f $script:ResolvedAppId)
    Write-Host ('Period: last {0} days | Generated at: {1}' -f $Days, $generatedAt)
    Write-Host 'Note: cookieless analytics makes Sessions approximate visits.' -ForegroundColor DarkGray

    Write-SectionTitle 'Visitors & traffic'
    $visitorTotals = Invoke-AppInsightsQuery -Kql 'pageViews | summarize Visits=count(), Sessions=dcount(session_Id)'
    $visitorTotals = @($visitorTotals | Where-Object { $null -ne $_ })
    if ($visitorTotals.Count -eq 0) {
        Write-Host '  (no data yet)' -ForegroundColor DarkGray
    }
    else {
        $totals = @($visitorTotals)[0]
        Write-Host ('  Visits: {0}  Sessions*: {1}' -f $totals.Visits, $totals.Sessions)
        Write-Host '  * Cookieless analytics: session_Id/user_Id are ephemeral per page load, so Sessions is approximately visits.' -ForegroundColor DarkGray
    }

    Write-Host ''
    Write-Host '  Visits per day:' -ForegroundColor DarkCyan
    $visitsPerDay = Invoke-AppInsightsQuery -Kql 'pageViews | summarize Visits=count() by bin(timestamp,1d) | order by timestamp asc'
    Write-DataTable -Rows (Format-DateColumn -Rows $visitsPerDay)

    $sections = @(
        @{
            Title = 'Engagement events/day'
            Kql = 'customEvents | summarize Events=count() by bin(timestamp,1d) | order by timestamp asc'
            FormatDates = $true
        },
        @{
            Title = 'Top events'
            Kql = 'customEvents | summarize Count=count() by name | order by Count desc'
        },
        @{
            Title = 'Key actions'
            Kql = "customEvents | where name in ('party_configured','plan_shared','plan_printed','price_lookup','config_opened') | summarize Count=count() by name | order by Count desc"
        },
        @{
            Title = 'Wizard funnel'
            Kql = "customEvents | where name startswith 'wizard' | summarize Count=count() by name"
        },
        @{
            Title = 'Child age distribution'
            Kql = "customEvents | where name=='party_configured' | extend age=toint(customDimensions.age) | summarize Parties=count() by age | order by age asc"
        },
        @{
            Title = 'Guest-count distribution'
            Kql = "customEvents | where name=='party_configured' | extend guests=toint(customDimensions.guests) | summarize Parties=count() by guests | order by guests asc"
        },
        @{
            Title = 'Home vs barnehage'
            Kql = "customEvents | where name=='party_configured' | summarize Count=count() by partyType=tostring(customDimensions.partyType)"
        },
        @{
            Title = 'Share method'
            Kql = "customEvents | where name=='plan_shared' | summarize Count=count() by method=tostring(customDimensions.method)"
        },
        @{
            Title = 'MENY shopping cart (feature funnel)'
            Kql = "customEvents | where name startswith 'meny_cart_' | summarize Count=count() by name | order by Count desc"
        }
    )

    foreach ($section in $sections) {
        Write-SectionTitle $section.Title
        $rows = Invoke-AppInsightsQuery -Kql $section.Kql
        if ($section.ContainsKey('FormatDates') -and $section.FormatDates) {
            $rows = Format-DateColumn -Rows $rows
        }
        Write-DataTable -Rows $rows
    }

    Write-Host ''
}
catch {
    $message = $_.Exception.Message
    Write-Host ''
    Write-Host 'Application Insights metrics could not be loaded.' -ForegroundColor Red
    if (Test-AzLoginMessage -Message $message) {
        Write-Host 'Azure CLI could not access the subscription. Run az login, then try again.' -ForegroundColor Yellow
    }
    Write-Host $message -ForegroundColor Red
    exit 1
}
