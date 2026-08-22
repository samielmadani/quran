import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceDirectory = resolve(root, 'data/badr-al-turki');
const quranPath = resolve(root, 'node_modules/quran-json/dist/quran.json');
const outputPath = resolve(root, 'src/data/badrAlTurkiTimings.ts');
const nativeOutputPath = resolve(root, 'public/data/badrAlTurkiTimings.json');

function readVarint(buffer, state) {
  let value = 0;
  let shift = 0;
  while (state.offset < buffer.length) {
    const byte = buffer[state.offset];
    state.offset += 1;
    value += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) return value;
    shift += 7;
  }
  throw new Error('Unexpected end of protobuf varint');
}

function readMessage(buffer) {
  const state = { offset: 0 };
  const fields = [];
  while (state.offset < buffer.length) {
    const tag = readVarint(buffer, state);
    const fieldNumber = tag >> 3;
    const wireType = tag & 7;
    if (wireType === 0) {
      fields.push({ fieldNumber, value: readVarint(buffer, state) });
    } else if (wireType === 2) {
      const length = readVarint(buffer, state);
      const end = state.offset + length;
      if (end > buffer.length) throw new Error('Invalid protobuf length');
      fields.push({ fieldNumber, value: buffer.subarray(state.offset, end) });
      state.offset = end;
    } else {
      throw new Error(`Unsupported protobuf wire type ${wireType}`);
    }
  }
  return fields;
}

function parseSurah(buffer, expectedSurah) {
  const timings = {};
  for (const record of readMessage(buffer).filter((field) => field.fieldNumber === 1)) {
    const fields = readMessage(record.value);
    const verseKey = fields.find((field) => field.fieldNumber === 1)?.value;
    const wordsContainer = fields.find((field) => field.fieldNumber === 2)?.value;
    if (!verseKey || !wordsContainer) throw new Error(`Malformed timing record in ${expectedSurah}`);

    const [surahText, ayahText] = new TextDecoder().decode(verseKey).split(':');
    const surah = Number(surahText);
    const ayah = Number(ayahText);
    if (surah !== expectedSurah || !Number.isInteger(ayah)) {
      throw new Error(`Unexpected verse key in ${expectedSurah}: ${new TextDecoder().decode(verseKey)}`);
    }

    const words = readMessage(wordsContainer).filter((field) => field.fieldNumber === 1);
    const ranges = words.map((word) => {
      const wordFields = readMessage(word.value);
      const startMs = wordFields.find((field) => field.fieldNumber === 3)?.value;
      const endMs = wordFields.find((field) => field.fieldNumber === 4)?.value;
      if (!Number.isInteger(startMs) || !Number.isInteger(endMs)) {
        throw new Error(`Malformed word timing for ${expectedSurah}:${ayah}`);
      }
      return { startMs, endMs };
    });
    if (ranges.length === 0) throw new Error(`No words for ${expectedSurah}:${ayah}`);
    timings[ayah] = {
      startMs: Math.min(...ranges.map((range) => range.startMs)),
      endMs: Math.max(...ranges.map((range) => range.endMs)),
    };
  }
  return timings;
}

const allTimings = {};
for (let surah = 1; surah <= 114; surah += 1) {
  const filename = `${String(surah).padStart(3, '0')}.pb`;
  allTimings[surah] = parseSurah(readFileSync(resolve(sourceDirectory, filename)), surah);
}

const bismillahEndMs = allTimings[1][2].startMs;
for (let surah = 2; surah <= 114; surah += 1) {
  if (surah !== 9) {
    allTimings[surah][0] = { startMs: 0, endMs: bismillahEndMs };
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
const output = `import type { AyahTiming } from '../types/audio';\n\nexport const badrAlTurkiTimings: Record<number, Record<number, AyahTiming>> = ${JSON.stringify(allTimings, null, 2)};\n`;
writeFileSync(outputPath, output);
mkdirSync(dirname(nativeOutputPath), { recursive: true });
writeFileSync(nativeOutputPath, `${JSON.stringify(allTimings)}\n`);
console.log(`Generated ${Object.keys(allTimings).length} surahs and ${Object.values(allTimings).reduce((sum, surah) => sum + Object.keys(surah).length, 0)} ayahs`);