const inlineReferencePattern = /(?<=[A-Za-z.,;:!?])([1-9]\d?)(?=\s|[.,;:!?]|$)/g;

export function cleanTranslationText(value: string): string {
  const text = value.replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/<[^>]+>/g, '').trim();
  const references = [...text.matchAll(inlineReferencePattern)].map((match) => Number(match[1]));
  const hasReferenceSequence = references.length >= 2 && references.some((number, index) => number === index + 1);
  return hasReferenceSequence ? text.replace(inlineReferencePattern, '').replace(/\s+([,.;!?])/g, '$1').replace(/\s{2,}/g, ' ').trim() : text;
}