// Genera config.js con la URL publica del gateway (variable API_URL) en la carpeta de salida.
// Uso: node scripts/write-config.mjs <carpeta-dist>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] || 'dist/frontend/browser';
const apiUrl = (process.env.API_URL || '').trim().replace(/\/$/, '');
if (apiUrl && !/^https?:\/\/[^\s'"<>]+$/.test(apiUrl)) {
  console.error('API_URL invalida:', apiUrl);
  process.exit(1);
}
const content = `window.__APP_CONFIG__ = ${JSON.stringify(apiUrl ? { apiUrl } : {})};\n`;
writeFileSync(join(outDir, 'config.js'), content);
console.log('config.js generado', apiUrl ? `-> ${apiUrl}` : '(desarrollo local)');
