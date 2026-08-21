/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANALYTICS_ENABLED?: string;
  readonly VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?: string;
  readonly VITE_FEATURE_MENY_CART?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
