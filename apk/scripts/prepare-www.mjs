/* ============================================================
   Turta — Android kabuğu için web dosyalarını hazırlar.
   Tek doğruluk kaynağı kök dizindeki index.html'dir; APK aynı
   dosyayı paketler. Bu betik yalnızca kopyalar, dönüştürmez.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');          // depo kökü
const OUT  = path.resolve(HERE, '..', 'www');

const FILES = ['index.html', 'manifest.webmanifest'];
const DIRS  = ['icons', 'sounds'];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) throw new Error('Eksik dosya: ' + f);
  fs.copyFileSync(src, path.join(OUT, f));
}
for (const d of DIRS) {
  const src = path.join(ROOT, d);
  if (!fs.existsSync(src)) throw new Error('Eksik klasör: ' + d);
  fs.cpSync(src, path.join(OUT, d), { recursive: true });
}

// Sürüm tutarlılığı: APK sürümü index.html'deki APP_VERSION'dan gelir.
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
const m = html.match(/const APP_VERSION = '([\d.]+)'/);
if (!m) throw new Error('APP_VERSION bulunamadı');
console.log(`[www] hazır → ${OUT} (Turta v${m[1]})`);
