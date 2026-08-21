@description('Globally unique Azure Static Web Apps resource name.')
param staticWebAppName string = 'kakeklar'

@description('Azure region for the managed API. Static content is globally distributed.')
param location string = 'westeurope'

resource staticWebApp 'Microsoft.Web/staticSites@2025-03-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

output staticWebAppId string = staticWebApp.id
output defaultHostname string = staticWebApp.properties.defaultHostname
