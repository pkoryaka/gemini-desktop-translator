// Generates a base64 PNG icon for Electron Tray and Window
const fs = require('fs');
const path = require('path');

// 32x32 transparent PNG with a glowing translation icon
// Creating a 32x32 RGBA PNG icon programmatically
function createTrayIconPng() {
  // A clean 32x32 PNG with a rounded purple/indigo badge and 'T'/'G' symbol
  const width = 32;
  const height = 32;
  
  // We can write a clean SVG and convert or create a standard RGBA raw buffer
  // SVG with modern translation symbol
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6366f1" />
        <stop offset="100%" stop-color="#06b6d4" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#grad)" />
    <path d="M7 11h10M12 7v4M9 11c1 4.5 4 8 8 10M15 15c-2 2.5-4.5 4.5-7 5.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <path d="M17 24l4-10 4 10M18.5 20.5h5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </svg>`;
  
  return svg;
}

const svgContent = createTrayIconPng();
fs.writeFileSync(path.join(__dirname, 'icon.svg'), svgContent, 'utf8');
console.log('Icon SVG created successfully.');
