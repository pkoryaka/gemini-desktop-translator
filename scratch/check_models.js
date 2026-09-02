const fs = require('fs');
const path = require('path');

async function check() {
  const dir = path.join(process.env.APPDATA, 'gemini-desktop-translator', 'Local Storage', 'leveldb');
  const files = fs.readdirSync(dir);
  let key = null;

  for (const file of files) {
    if (file.endsWith('.ldb') || file.endsWith('.log')) {
      const buf = fs.readFileSync(path.join(dir, file));
      const str = buf.toString('latin1');
      const match = str.match(/AIza[0-9A-Za-z_-]{35}/);
      if (match) {
        key = match[0];
        break;
      }
    }
  }

  if (!key) {
    console.log('No API key found in leveldb');
    return;
  }

  console.log('Found key starting with:', key.slice(0, 8) + '...');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  if (!res.ok) {
    console.log('API Error:', res.status, res.statusText, await res.text());
    return;
  }

  const data = await res.json();
  const models = data.models || [];
  console.log('All available models for this key:');
  models.forEach(m => {
    if (m.supportedGenerationMethods?.includes('generateContent')) {
      console.log(' - ' + m.name + ' (' + (m.displayName || '') + ')');
    }
  });
}

check().catch(console.error);
