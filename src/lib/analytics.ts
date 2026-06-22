import type { ApplicationInsights, IEventTelemetry } from '@microsoft/applicationinsights-web';
import { getAppConfig } from './config';

/**
 * Privacy-first (cookieless) Azure Application Insights wrapper.
 *
 * Configured with `disableCookiesUsage` + no session-storage buffer, so it stores
 * NOTHING on the user's device and uses no persistent identifier. Combined with
 * Application Insights' default IP masking, this is "anonymous aggregate analytics"
 * and therefore does NOT require a cookie-consent banner under the EU ePrivacy
 * Directive / Norwegian ekomloven §3-15. See docs/analytics.md.
 *
 * Telemetry is disabled gracefully when no connection string is configured
 * (e.g. local dev), so the app works identically with or without analytics.
 */

let ai: ApplicationInsights | null = null;
let ready = false;
const queue: IEventTelemetry[] = [];

type Props = Record<string, string | number | boolean | undefined | null>;

function splitProps(properties?: Props) {
  const props: Record<string, string> = {};
  const measurements: Record<string, number> = {};
  if (properties) {
    for (const [k, v] of Object.entries(properties)) {
      if (v == null) continue;
      if (typeof v === 'number') {
        measurements[k] = v;
        props[k] = String(v);
      } else {
        props[k] = String(v);
      }
    }
  }
  return { props, measurements };
}

/** Initialise analytics. Fetches the connection string from the server at runtime. */
export async function initAnalytics(): Promise<void> {
  try {
    const cfg = await getAppConfig();
    const connectionString: string | undefined = cfg?.appInsights?.connectionString;

    if (!connectionString) {
      ready = true;
      queue.length = 0; // analytics disabled — drop anything buffered
      return;
    }

    // Lazy-load the SDK as a separate chunk so it never blocks first paint.
    const { ApplicationInsights } = await import('@microsoft/applicationinsights-web');
    ai = new ApplicationInsights({
      config: {
        connectionString,
        // --- privacy: zero device storage, no persistent identifiers ---
        disableCookiesUsage: true,
        enableSessionStorageBuffer: false,
        enableAutoRouteTracking: false,
        disableAjaxTracking: true,
        disableFetchTracking: true,
        autoTrackPageVisitTime: true
      }
    });
    ai.loadAppInsights();
    ai.trackPageView({ name: 'Kakeklar' });

    ready = true;
    for (const ev of queue) ai.trackEvent(ev);
    queue.length = 0;
  } catch {
    ready = true;
    ai = null;
    queue.length = 0;
  }
}

/** Track a custom engagement event. No-ops (or buffers briefly) until init resolves. */
export function track(name: string, properties?: Props): void {
  const { props, measurements } = splitProps(properties);
  const ev: IEventTelemetry = { name, properties: props, measurements };
  if (ai) {
    ai.trackEvent(ev);
  } else if (!ready) {
    queue.push(ev); // buffer the handful of events fired before init resolves
  }
}
