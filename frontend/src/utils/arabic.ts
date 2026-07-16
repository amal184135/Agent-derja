/**
 * Retire les diacritiques arabes (tachkil) d'un texte pour l'affichage.
 * Plage Unicode couverte : Fatha, Damma, Kasra, Sukun, Shadda, Tanwin, Madda, etc.
 */
export function removeArabicDiacritics(text: string): string {
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u08D4-\u08E1\u08E3-\u08FF]/g, "");
}