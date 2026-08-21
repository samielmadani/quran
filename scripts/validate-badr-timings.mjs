import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const quran = JSON.parse(readFileSync(resolve(root, 'node_modules/quran-json/dist/quran.json'), 'utf8'));
const sourceDirectory = resolve(root, 'data/badr-al-turki');
const generated = readFileSync(resolve(root, 'src/data/badrAlTurkiTimings.ts'), 'utf8');
const data = JSON.parse(generated.slice(generated.indexOf(' = ') + 3).replace(/;\s*$/, ''));
let missing = 0;
let invalid = 0;
let sourceOverlaps = 0;
let unexpectedOverlaps = 0;
let durationMismatches = 0;
let durationChecks = 0;
let surahs = 0;
let ayahs = 0;
for (const surah of quran) {
  const timings = data[surah.id];
  if (!timings) { missing += surah.total_verses; continue; }
  surahs += 1;
  if (surah.id !== 1 && surah.id !== 9) {
    const bismillah = timings[0];
    if (!bismillah || bismillah.startMs !== 0 || bismillah.endMs !== data[1][2].startMs) invalid += 1;
  }
  for (let ayah = 1; ayah <= surah.total_verses; ayah += 1) {
    const timing = timings[ayah];
    if (!timing) { missing += 1; continue; }
    ayahs += 1;
    if (timing.startMs < 0 || timing.startMs >= timing.endMs) invalid += 1;
    const previous = ayah === 1 && surah.id !== 1 && surah.id !== 9 ? undefined : timings[ayah - 1];
    if (previous && previous.endMs > timing.startMs) {
      const overlapMs = previous.endMs - timing.startMs;
      if (overlapMs <= 100) sourceOverlaps += 1;
      else { unexpectedOverlaps += 1; invalid += 1; }
    }
  }
  if (!existsSync(resolve(sourceDirectory, `${String(surah.id).padStart(3, '0')}.pb`))) invalid += 1;
  const audioPath = resolve(root, 'assets/audio/badr-al-turki', `${String(surah.id).padStart(3, '0')}.mp3`);
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath], { encoding: 'utf8' });
  const durationMs = Number.parseFloat(probe.stdout?.trim() ?? '') * 1000;
  if (Number.isFinite(durationMs)) {
    durationChecks += 1;
    if (timings[surah.total_verses]?.endMs > durationMs + 1000) durationMismatches += 1;
  }
}
const expectedAyahs = quran.reduce((sum, surah) => sum + surah.total_verses, 0);
console.log('Badr Al-Turki timing validation');
console.log('-------------------------------');
console.log(`Surahs: ${surahs}/114`);
console.log(`Ayahs: ${ayahs}/${expectedAyahs}`);
console.log(`Missing timings: ${missing}`);
console.log(`Invalid timings: ${invalid}`);
console.log(`Source boundary overlaps (<=100ms): ${sourceOverlaps}`);
console.log(`Unexpected overlaps: ${unexpectedOverlaps}`);
console.log(`Duration mismatches: ${durationChecks ? durationMismatches : 'not checked (ffprobe unavailable)'}`);
console.log(`Status: ${surahs === 114 && ayahs === expectedAyahs && missing === 0 && invalid === 0 ? 'PASS' : 'FAIL'}`);
if (missing || invalid || surahs !== 114 || ayahs !== expectedAyahs) process.exitCode = 1;