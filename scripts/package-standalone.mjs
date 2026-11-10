import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const asset = p => fs.readFileSync(path.join(dist, p.replace(/^\//, '')));
let fontCount = 0;
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, src) => {
  let css = asset(src).toString();
  // Modern Chrome/Edge use WOFF2; omit duplicate WOFF fallback bytes.
  css = css.replace(/,\s*url\([^)]*\.woff\)\s*format\(["']woff["']\)/g, '');
  css = css.replace(/url\((\/assets\/[^)]+)\)/g, (_, url) => {
    fontCount++;
    const mime = url.endsWith('.woff2') ? 'font/woff2' : 'font/woff';
    return `url(data:${mime};base64,${asset(url).toString('base64')})`;
  });
  return `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`;
});
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => `<script type="module">${asset(src).toString().replace(/<\/script/gi, '<\\/script')}</script>`);
html = html.replace('href="/favicon.svg"', `href="data:image/svg+xml;base64,${asset('/favicon.svg').toString('base64')}"`);
const licenses = ['Noto-Serif-SC-OFL.txt', 'Noto-Sans-SC-OFL.txt', 'Lucide-ISC.txt'].map(f => asset(`/licenses/${f}`).toString()).join('\n');
html = html.replace('</head>', `<!-- Bundled font and icon licenses:\n${licenses.replace(/-->/g, '-- >')}\n-->\n</head>`);
fs.mkdirSync(path.join(root, 'artifacts'), {recursive:true});
const output = path.join(root, 'artifacts', '小鸿雁宣传物料生成器-原图版.html');
fs.writeFileSync(output, html);
console.log(JSON.stringify({file:output,bytes:Buffer.byteLength(html),embeddedFonts:fontCount}));
