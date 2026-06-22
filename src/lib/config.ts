export interface AppConfig {
  appInsights?: { connectionString: string } | null;
  features?: { menyCart?: boolean };
}

let pending: Promise<AppConfig> | null = null;

/** Fetch the runtime client config from the server once and memoize it. */
export function getAppConfig(): Promise<AppConfig> {
  if (!pending) {
    pending = fetch('/api/config', { cache: 'no-store' })
      .then((r) => r.json())
      .catch(() => ({} as AppConfig));
  }
  return pending;
}
