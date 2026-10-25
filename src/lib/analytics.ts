import type { ApplicationInsights, IEventTelemetry } from '@microsoft/applicationinsights-web';
import { BUILD_CONFIG } from './buildConfig';
import posthog, { isPostHogEnabled } from './posthog';

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

const POSTHOG_EVENTS = new Set([
  'plan_shared',
  'plan_printed',
  'config_opened',
  'wizard_step',
  'wizard_completed',
  'wizard_skipped',
  'party_type_changed',
  'plan_exported',
  'affiliate_click',
  'meny_cart_started',
  'meny_cart_created',
  'meny_cart_shared',
  'meny_cart_opened',
  'agent_prompt_opened',
  'agent_prompt_copied',
  'pwa_installed'
]);

function posthogProperties(name: string, properties?: Props): Props | undefined {
  if (!POSTHOG_EVENTS.has(name)) return undefined;

  switch (name) {
    case 'plan_shared':
      return { method: properties?.method, guests: properties?.guests, age: properties?.age };
    case 'plan_printed':
      return { guests: properties?.guests, age: properties?.age };
    case 'plan_exported':
      return { format: properties?.format, guests: properties?.guests, age: properties?.age };
    case 'meny_cart_started':
    case 'agent_prompt_opened':
      return { items: properties?.items, guests: properties?.guests, age: properties?.age };
    case 'wizard_step':
      return { step: properties?.step };
    case 'party_type_changed':
      return { type: properties?.type };
    case 'affiliate_click':
      return { category: properties?.category, merchant: properties?.merchant };
    case 'meny_cart_created':
      return { matched: properties?.matched, unmatched: properties?.unmatched };
    case 'meny_cart_shared':
      return { method: properties?.method };
    case 'meny_cart_opened':
      return { matched: properties?.matched };
    case 'agent_prompt_copied':
      return { method: properties?.method, items: properties?.items };
    default:
      return undefined;
  }
}

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

/** Initialise analytics from the configuration embedded by Vite. */
export async function initAnalytics(): Promise<void> {
  try {
    const connectionString = BUILD_CONFIG.appInsightsConnectionString;

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
  const posthogEventProperties = posthogProperties(name, properties);
  if (isPostHogEnabled && POSTHOG_EVENTS.has(name)) {
    posthog.capture(name, posthogEventProperties);
  }

  const { props, measurements } = splitProps(properties);
  const ev: IEventTelemetry = { name, properties: props, measurements };
  if (ai) {
    ai.trackEvent(ev);
  } else if (!ready) {
    queue.push(ev); // buffer the handful of events fired before init resolves
  }
}
