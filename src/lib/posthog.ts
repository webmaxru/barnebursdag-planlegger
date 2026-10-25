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

if (!projectToken) {
  if (import.meta.env.DEV) {
    throw new Error(
      'VITE_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_KEY is configured'
    );
  }
} else if (!host) {
  if (import.meta.env.DEV) {
    throw new Error(
      'VITE_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_HOST is configured'
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: '2026-05-30',
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
