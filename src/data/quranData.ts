import quranData from 'quran-json/dist/quran.json';

export type Ayah = {
  number: number;
  text: string;
};

export type Surah = {
  number: number;
  nameArabic: string;
  nameTransliteration: string;
  englishName: string;
  type: string;
  totalAyahs: number;
  ayahs: Ayah[];
};

export type QuranDataset = {
  surahs: Surah[];
};

const raw = quranData as Array<{
  id: number;
  name: string;
  transliteration: string;
  type: string;
  total_verses: number;
  verses: Array<{ id: number; text: string }>;
}>;

const englishSurahNames = [
  'The Opening', 'The Cow', 'The Family of Imran', 'The Women', 'The Table Spread', 'The Cattle', 'The Heights', 'The Spoils of War', 'The Repentance', 'Jonah', 'Hud', 'Joseph', 'The Thunder', 'Abraham', 'The Rocky Tract', 'The Bee', 'The Night Journey', 'The Cave', 'Mary', 'Ta-Ha', 'The Prophets', 'The Pilgrimage', 'The Believers', 'The Light', 'The Criterion', 'The Poets', 'The Ant', 'The Stories', 'The Spider', 'The Romans', 'Luqman', 'The Prostration', 'The Combined Forces', 'Sheba', 'Originator', 'Ya-Sin', 'Those Ranged in Ranks', 'Sad', 'The Groups', 'The Forgiver', 'Explained in Detail', 'The Consultation', 'The Ornaments of Gold', 'The Smoke', 'The Crouching', 'The Wind-Curved Sandhills', 'Muhammad', 'The Victory', 'The Rooms', 'Qaf', 'The Winnowing Winds', 'The Mount', 'The Star', 'The Moon', 'The Most Merciful', 'The Inevitable', 'The Iron', 'The Pleading Woman', 'The Exile', 'She That Is to Be Examined', 'The Ranks', 'Friday', 'The Hypocrites', 'Mutual Disillusion', 'Divorce', 'The Prohibition', 'The Sovereignty', 'The Pen', 'The Reality', 'The Ascending Stairways', 'Noah', 'The Jinn', 'The Enshrouded One', 'The Cloaked One', 'The Resurrection', 'Man', 'Those Sent Forth', 'The Great News', 'Those Who Drag Forth', 'He Frowned', 'The Overthrowing', 'The Cleaving', 'Defrauding', 'The Splitting Asunder', 'The Mansions of the Stars', 'The Morning Star', 'The Most High', 'The Overwhelming', 'The Dawn', 'The City', 'The Sun', 'The Night', 'The Morning Hours', 'The Relief', 'The Fig', 'The Clot', 'The Power', 'The Clear Proof', 'The Earthquake', 'The Courser', 'The Striking Hour', 'The Rivalry in World Increase', 'The Declining Day', 'The Traducer', 'The Elephant', 'Quraysh', 'Small Kindnesses', 'Abundance', 'The Disbelievers', 'The Help', 'The Palm Fiber', 'Sincerity', 'The Daybreak', 'Mankind',
];

export const quranDataset: QuranDataset = {
  surahs: raw.map((surah) => ({
    number: surah.id,
    nameArabic: surah.name,
    nameTransliteration: surah.transliteration,
    englishName: englishSurahNames[surah.id - 1] ?? surah.transliteration,
    type: surah.type || 'meccan',
    totalAyahs: surah.total_verses,
    ayahs: surah.verses.map((ayah) => ({
      number: ayah.id,
      text: ayah.text,
    })),
  })),
};

export const totalSurahs = quranDataset.surahs.length;

export const getSurahByNumber = (surahNumber: number) =>
  quranDataset.surahs.find((surah) => surah.number === surahNumber) ?? quranDataset.surahs[0];

export const getAyahReference = (surahNumber: number, ayahNumber: number) => {
  const surah = getSurahByNumber(surahNumber);
  const ayah = surah.ayahs.find((item) => item.number === ayahNumber);

  return { surah, ayah };
};
