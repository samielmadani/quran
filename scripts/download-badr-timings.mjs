import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { once } from 'node:events';

const outputDirectory = new URL('../data/badr-al-turki/', import.meta.url);
const baseUrl = 'https://cdn.mualim.app/badr-al-turki-murattal';

mkdirSync(outputDirectory, { recursive: true });

for (let surah = 1; surah <= 114; surah += 1) {
  const filename = `${String(surah).padStart(3, '0')}.pb`;
  const output = new URL(filename, outputDirectory);
  if (existsSync(output)) {
    console.log(`Exists ${filename}`);
    continue;
  }

  const response = await fetch(`${baseUrl}/${filename}`);
  if (!response.ok || !response.body) {
    throw new Error(`Unable to download ${filename}: ${response.status} ${response.statusText}`);
  }

  const stream = createWriteStream(output);
  for await (const chunk of response.body) {
    if (!stream.write(chunk)) {
      await once(stream, 'drain');
    }
  }
  stream.end();
  await once(stream, 'close');
  console.log(`Downloaded ${filename}`);
}