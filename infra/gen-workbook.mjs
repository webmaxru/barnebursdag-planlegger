// Generates an Azure Monitor Workbook ARM template for Kakeklar user-engagement metrics.
// Run: node infra/gen-workbook.mjs  ->  writes infra/engagement-workbook.json
import { writeFileSync } from 'node:fs';

const q = (title, query, visualization, size = 0) => ({
  type: 3,
  content: {
    version: 'KqlItem/1.0',
    query,
    size,
    title,
    timeContextFromParameter: 'TimeRange',
    queryType: 0,
    resourceType: 'microsoft.insights/components',
    visualization
  }
});
const text = (json) => ({ type: 1, content: { json } });

const content = {
  version: 'Notebook/1.0',
  items: [
    text(
      '# 🎂 Kakeklar – User Engagement\n\nCookieless Application Insights – no cookies, no personal identifiers, IP masked. Use the time range below to filter.'
    ),
    {
      type: 9,
      content: {
        version: 'KqlParameterItem/1.0',
        parameters: [
          {
            id: 'tr',
            version: 'KqlParameterItem/1.0',
            name: 'TimeRange',
            type: 4,
            isRequired: true,
            value: { durationMs: 2592000000 },
            typeSettings: {
              selectableValues: [
                { durationMs: 3600000 },
                { durationMs: 86400000 },
                { durationMs: 604800000 },
                { durationMs: 2592000000 },
                { durationMs: 7776000000 }
              ]
            }
          }
        ],
        style: 'pills'
      }
    },

    text('## Engasjement over tid'),
    q('Aktive økter per dag', 'union customEvents, pageViews\n| summarize ["Økter"] = dcount(session_Id) by bin(timestamp, 1d)', 'timechart'),
    q('Hendelser per dag', 'customEvents\n| summarize Hendelser = count() by bin(timestamp, 1d)', 'barchart'),
    q('Sidevisninger', 'pageViews\n| summarize Visninger = count() by bin(timestamp, 1h)', 'timechart'),

    text('## Hva brukerne gjør'),
    q('Topp hendelser', 'customEvents\n| summarize Antall = count() by name\n| sort by Antall desc', 'barchart', 1),
    q(
      'Nøkkelhandlinger',
      "customEvents\n| where name in ('plan_shared','plan_printed','config_opened','config_changed','price_lookup','suggested_guests_used','allergy_toggled','party_type_changed','pwa_installed')\n| summarize Antall = count() by name\n| sort by Antall desc",
      'table',
      1
    ),
    q('Delemetode', "customEvents\n| where name == 'plan_shared'\n| summarize Antall = count() by tostring(customDimensions.method)", 'piechart'),

    text('## Hvilke bursdager planlegges'),
    q(
      'Fordeling: barnets alder',
      "customEvents\n| where name == 'party_configured'\n| extend alder = toint(customDimensions.age)\n| where isnotnull(alder)\n| summarize Bursdager = count() by alder\n| sort by alder asc",
      'barchart'
    ),
    q(
      'Fordeling: antall gjester',
      "customEvents\n| where name == 'party_configured'\n| extend gjester = toint(customDimensions.guests)\n| where isnotnull(gjester)\n| summarize Bursdager = count() by gjester\n| sort by gjester asc",
      'barchart'
    ),
    q('Type feiring (hjemme vs barnehage)', "customEvents\n| where name == 'party_configured'\n| summarize Antall = count() by tostring(customDimensions.partyType)", 'piechart')
  ]
};

const template = {
  $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
  contentVersion: '1.0.0.0',
  parameters: {
    workbookDisplayName: { type: 'string', defaultValue: 'Kakeklar – User Engagement' },
    appInsightsResourceId: { type: 'string', metadata: { description: 'Resource ID of the Application Insights component' } },
    location: { type: 'string', defaultValue: '[resourceGroup().location]' }
  },
  variables: { workbookId: "[guid(parameters('workbookDisplayName'), parameters('appInsightsResourceId'))]" },
  resources: [
    {
      type: 'microsoft.insights/workbooks',
      apiVersion: '2022-04-01',
      name: "[variables('workbookId')]",
      location: "[parameters('location')]",
      kind: 'shared',
      properties: {
        displayName: "[parameters('workbookDisplayName')]",
        serializedData: JSON.stringify(content),
        category: 'workbook',
        sourceId: "[parameters('appInsightsResourceId')]",
        version: 'Notebook/1.0'
      }
    }
  ],
  outputs: {
    workbookResourceId: { type: 'string', value: "[resourceId('microsoft.insights/workbooks', variables('workbookId'))]" }
  }
};

writeFileSync(new URL('./engagement-workbook.json', import.meta.url), JSON.stringify(template, null, 2));
console.log('✓ wrote infra/engagement-workbook.json');
