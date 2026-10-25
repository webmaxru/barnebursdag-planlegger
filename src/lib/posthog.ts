import posthog from 'posthog-js';

const projectToken = import.meta.env.VITE_POSTHOG_KEY?.trim();
const host = import.meta.env.VITE_POSTHOG_HOST?.trim();
export const isPostHogEnabled = Boolean(projectToken && host);

type LogAttributes = Record<string, string | number | boolean>;

export const posthogLogger = {
  info(message: string, attributes: LogAttributes): void {
    if (isPostHogEnabled) posthog.logger.info(message, attributes);
  },
  error(message: string, attributes: LogAttributes): void {
    if (isPostHogEnabled) posthog.logger.error(message, attributes);
  }
};

if (!projectToken || !host) {
  if (import.meta.env.DEV) {
    console.warn('PostHog is disabled: set both VITE_POSTHOG_KEY and VITE_POSTHOG_HOST to send events.');
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: '2026-05-30',
    // Cookieless like Application Insights: no cookies, localStorage or persistent identifiers.
    persistence: 'memory',
    disable_session_recording: true,
    logs: {
      serviceName: 'kakeklar-web',
      environment: import.meta.env.MODE
    },
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false
    }
  });
}

export default posthog;
