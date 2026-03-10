// ISO 639-1 language codes for common languages used in language learning
const LANGUAGE_CODES = [
  "af", "am", "ar", "az", "be", "bg", "bn", "bs", "ca", "cs",
  "cy", "da", "de", "el", "en", "es", "et", "eu", "fa", "fi",
  "fil", "fr", "ga", "gl", "gu", "ha", "he", "hi", "hr", "hu",
  "hy", "id", "is", "it", "ja", "jv", "ka", "kk", "km", "kn",
  "ko", "ku", "ky", "la", "lb", "lo", "lt", "lv", "mg", "mi",
  "mk", "ml", "mn", "mr", "ms", "mt", "my", "nb", "ne", "nl",
  "nn", "no", "pa", "pl", "ps", "pt", "ro", "ru", "rw", "sd",
  "si", "sk", "sl", "so", "sq", "sr", "su", "sv", "sw", "ta",
  "te", "tg", "th", "tk", "tl", "tr", "tt", "uk", "ur", "uz",
  "vi", "xh", "yo", "zh", "zu",
];

function getLanguageList(): { code: string; name: string }[] {
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "language" });
    return LANGUAGE_CODES
      .map((code) => {
        try {
          const name = displayNames.of(code);
          return name ? { code, name } : null;
        } catch {
          return null;
        }
      })
      .filter((v): v is { code: string; name: string } => v !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    // Fallback if Intl.DisplayNames is not supported
    return LANGUAGE_CODES.map((code) => ({ code, name: code.toUpperCase() }));
  }
}

export const LANGUAGES = getLanguageList();
