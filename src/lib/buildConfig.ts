const enabled = (value: string | undefined) => value === '1';
const analyticsEnabled = enabled(import.meta.env.VITE_ANALYTICS_ENABLED);

export const BUILD_CONFIG = {
  appInsightsConnectionString: analyticsEnabled
    ? import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?.trim() || ''
    : '',
  menyCart: enabled(import.meta.env.VITE_FEATURE_MENY_CART)
} as const;
