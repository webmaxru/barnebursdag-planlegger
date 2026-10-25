/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANALYTICS_ENABLED?: string;
  readonly VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_FEATURE_MENY_CART?: string;
  readonly VITE_AFFILIATE_LINKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
