@description('Globally unique Azure Static Web Apps resource name.')
param staticWebAppName string = 'kakeklar'

@description('Azure region for the managed API. Static content is globally distributed.')
param location string = 'westeurope'

@secure()
@description('Optional Kassal.app API key used by the server-side price proxy.')
param kassalApiKey string = ''

@secure()
@description('Optional Application Insights connection string exposed to the cookieless browser SDK.')
param applicationInsightsConnectionString string = ''

@description('Enable the experimental MENY shared-cart UI.')
param featureMenyCart bool = true

resource staticWebApp 'Microsoft.Web/staticSites@2025-03-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

resource apiSettings 'Microsoft.Web/staticSites/config@2025-03-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    KASSAL_API_KEY: kassalApiKey
    APPLICATIONINSIGHTS_CONNECTION_STRING: applicationInsightsConnectionString
    FEATURE_MENY_CART: featureMenyCart ? '1' : '0'
  }
}

output staticWebAppId string = staticWebApp.id
output defaultHostname string = staticWebApp.properties.defaultHostname
