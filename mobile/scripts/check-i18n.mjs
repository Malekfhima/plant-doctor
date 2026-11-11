import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/i18n/locales/', import.meta.url));
const languages = ['fr', 'en', 'ar'];

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child)
      ? flattenKeys(child, path)
      : [path];
  });
}

const catalogs = new Map();
for (const language of languages) {
  const contents = await readFile(join(root, `${language}.json`), 'utf8');
  catalogs.set(language, flattenKeys(JSON.parse(contents)).sort());
}

const reference = new Set(catalogs.get('en'));
let failed = false;
for (const language of languages) {
  const keys = new Set(catalogs.get(language));
  const missing = [...reference].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !reference.has(key));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`${language}.json key mismatch`);
    if (missing.length) console.error(`  missing: ${missing.join(', ')}`);
    if (extra.length) console.error(`  extra: ${extra.join(', ')}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`Locale keys match across ${languages.join(', ')} (${reference.size} keys).`);
}
