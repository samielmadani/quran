import fs from 'fs';
import path from 'path';

const RECITERS = [
  { id: 'mishari-alafasy', recitationId: 7, file: 'mishariAlafasyTimings.ts', varName: 'mishariAlafasyTimings' },
  { id: 'mahmoud-al-husary', recitationId: 6, file: 'mahmoudAlHusaryTimings.ts', varName: 'mahmoudAlHusaryTimings' },
  { id: 'abdul-basit-murattal', recitationId: 2, file: 'abdulBasitTimings.ts', varName: 'abdulBasitTimings' },
  { id: 'muhammad-siddiq-al-minshawi', recitationId: 9, file: 'muhammadSiddiqAlMinshawiTimings.ts', varName: 'muhammadSiddiqAlMinshawiTimings' },
  { id: 'abu-bakr-al-shatri', recitationId: 4, file: 'abuBakrAlShatriTimings.ts', varName: 'abuBakrAlShatriTimings' },
  { id: 'abdul-rahman-al-sudais', recitationId: 3, file: 'abdulRahmanAlSudaisTimings.ts', varName: 'abdulRahmanAlSudaisTimings' },
];

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function run() {
  const outDir = path.resolve('src/data');

  for (const reciter of RECITERS) {
    console.log(`Fetching timings for ${reciter.id} (recitation ${reciter.recitationId})...`);
    const allTimings = {};

    // Process chapters in batches of 10
    for (let c = 1; c <= 114; c += 10) {
      const batch = [];
      for (let i = c; i < Math.min(115, c + 10); i++) {
        batch.push(
          (async (ch) => {
            const url = `https://api.quran.com/api/v4/chapter_recitations/${reciter.recitationId}/${ch}?segments=true`;
            const data = await fetchWithRetry(url);
            const timestamps = data?.audio_file?.timestamps || [];
            const chapterTimings = {};

            for (const item of timestamps) {
              const [, verseStr] = item.verse_key.split(':');
              const ayahNum = Number(verseStr);
              chapterTimings[ayahNum] = {
                startMs: Math.round(item.timestamp_from),
                endMs: Math.round(item.timestamp_to),
              };
            }
            allTimings[ch] = chapterTimings;
          })(i)
        );
      }
      await Promise.all(batch);
      console.log(`  Processed up to chapter ${Math.min(114, c + 9)}`);
    }

    const tsContent = `import type { AyahTiming } from '../types/audio';\n\nexport const ${reciter.varName}: Record<number, Record<number, AyahTiming>> = ${JSON.stringify(allTimings, null, 2)};\n`;
    const targetPath = path.join(outDir, reciter.file);
    fs.writeFileSync(targetPath, tsContent, 'utf-8');
    console.log(`Saved ${targetPath}`);
  }
  console.log('All reciter timings generated successfully!');
}

run().catch(console.error);
