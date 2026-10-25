import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');

async function collectFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(target, extension);
      return entry.isFile() && entry.name.endsWith(extension) ? [target] : [];
    })
  );
  return files.flat();
}

const files = await collectFiles(dist, '.js');
const content = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
const expectedConnectionString = process.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?.trim();
const analyticsEnabled = process.env.VITE_ANALYTICS_ENABLED === '1';
const posthogKey = process.env.VITE_POSTHOG_KEY?.trim();

if (content.includes('/api/config')) {
  throw new Error('Production bundle still references /api/config.');
}

if ((await collectFiles(dist, '.map')).length > 0) {
  throw new Error('Source maps must be uploaded and deleted before the artifact is published.');
}

if (posthogKey && !content.includes(posthogKey)) {
  throw new Error('Production bundle does not contain the configured PostHog project key.');
}

if (analyticsEnabled && (!expectedConnectionString || !content.includes(expectedConnectionString))) {
  throw new Error('Production bundle does not contain the configured Application Insights connection string.');
}

if (!analyticsEnabled && expectedConnectionString && content.includes(expectedConnectionString)) {
  throw new Error('Analytics is disabled, but the connection string remains in the production bundle.');
}

console.log('Production bundle contains build-time configuration and no runtime config endpoint.');
