import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');

async function collectJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectJavaScript(target);
      return entry.isFile() && entry.name.endsWith('.js') ? [target] : [];
    })
  );
  return files.flat();
}

const files = await collectJavaScript(dist);
const content = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
const expectedConnectionString = process.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?.trim();
const analyticsEnabled = process.env.VITE_ANALYTICS_ENABLED === '1';

if (content.includes('/api/config')) {
  throw new Error('Production bundle still references /api/config.');
}

if (analyticsEnabled && (!expectedConnectionString || !content.includes(expectedConnectionString))) {
  throw new Error('Production bundle does not contain the configured Application Insights connection string.');
}

if (!analyticsEnabled && expectedConnectionString && content.includes(expectedConnectionString)) {
  throw new Error('Analytics is disabled, but the connection string remains in the production bundle.');
}

console.log('Production bundle contains build-time configuration and no runtime config endpoint.');
