const connectionString = process.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?.trim();
const analyticsEnabled = process.env.VITE_ANALYTICS_ENABLED?.trim();
const menyCart = process.env.VITE_FEATURE_MENY_CART?.trim();

if (!/^(1|0)$/.test(analyticsEnabled || '')) {
  throw new Error('VITE_ANALYTICS_ENABLED must be 1 or 0.');
}

if (analyticsEnabled === '1' && !connectionString) {
  throw new Error('VITE_APPLICATIONINSIGHTS_CONNECTION_STRING is required for a production build.');
}

if (!/^(1|0)$/.test(menyCart || '')) {
  throw new Error('VITE_FEATURE_MENY_CART must be 1 or 0.');
}

console.log('Production build configuration is present.');
