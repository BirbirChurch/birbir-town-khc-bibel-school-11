/**
 * Comprehensive Amharic (Ethiopic) Collation and Sorting Utility
 * Implements the traditional Ethiopic fidel sequence (ሀ እስከ ፐ) across all 7 vowel orders.
 */

const AMHARIC_FIDEL_SERIES: string[] = [
  // 1. ሀ
  'ሀ', 'ሁ', 'ሂ', 'ሃ', 'ሄ', 'ህ', 'ሆ', 'ኋ',
  // 2. ለ
  'ለ', 'ሉ', 'ሊ', 'ላ', 'ሌ', 'ል', 'ሎ', 'ሏ', 'ሇ',
  // 3. ሐ
  'ሐ', 'ሑ', 'ሒ', 'ሓ', 'ሔ', 'ሕ', 'ሖ', 'ሗ',
  // 4. መ
  'መ', 'ሙ', 'ሚ', 'ማ', 'ሜ', 'ም', 'ሞ', 'ሟ', 'ፙ',
  // 5. ሠ
  'ሠ', 'ሡ', 'ሢ', 'ሣ', 'ሤ', 'ሥ', 'ሦ', 'ሧ',
  // 6. ረ
  'ረ', 'ሩ', 'ሪ', 'ራ', 'ሬ', 'ር', 'ሮ', 'ሯ', 'ፘ',
  // 7. ሰ
  'ሰ', 'ሱ', 'ሲ', 'ሳ', 'ሴ', 'ስ', 'ሶ', 'ሷ',
  // 8. ሸ
  'ሸ', 'ሹ', 'ሺ', 'ሻ', 'ሼ', 'ሽ', 'ሾ', 'ሿ',
  // 9. ቀ
  'ቀ', 'ቁ', 'ቂ', 'ቃ', 'ቄ', 'ቅ', 'ቆ', 'ቈ', 'ቊ', 'ቋ', 'ቌ', 'ቍ',
  // 10. በ
  'በ', 'ቡ', 'ቢ', 'ባ', 'ቤ', 'ብ', 'ቦ', 'ቧ', 'ፚ',
  // 11. ቨ
  'ቨ', 'ቩ', 'ቪ', 'ቫ', 'ቬ', 'ቭ', 'ቮ', 'ቯ',
  // 12. ተ
  'ተ', 'ቱ', 'ቲ', 'ታ', 'ቴ', 'ት', 'ቶ', 'ቷ',
  // 13. ቸ
  'ቸ', 'ቹ', 'ቺ', 'ቻ', 'ቼ', 'ች', 'ቾ', 'ቿ',
  // 14. ኀ
  'ኀ', 'ኁ', 'ኂ', 'ኃ', 'ኄ', 'ኅ', 'ኆ', 'ኈ', 'ኊ', 'ኋ', 'ኌ', 'ኍ',
  // 15. ነ
  'ነ', 'ኑ', 'ኒ', 'ና', 'ኔ', 'ን', 'ኖ', 'ኗ',
  // 16. ኘ
  'ኘ', 'ኙ', 'ኚ', 'ኛ', 'ኜ', 'ኝ', 'ኞ', 'ኟ',
  // 17. አ
  'አ', 'ኡ', 'ኢ', 'ኣ', 'ኤ', 'እ', 'ኦ', 'ኧ',
  // 18. ከ
  'ከ', 'ኩ', 'ኪ', 'ካ', 'ኬ', 'ክ', 'ኮ', 'ኰ', 'ኲ', 'ኳ', 'ኴ', 'ኵ',
  // 19. ኸ
  'ኸ', 'ኹ', 'ኺ', 'ኻ', 'ኼ', 'ኽ', 'ኾ', 'ዀ', 'ዂ', 'ዃ', 'ዄ', 'ዅ',
  // 20. ወ
  'ወ', 'ዉ', 'ዊ', 'ዋ', 'ዌ', 'ው', 'ዎ',
  // 21. ዐ
  'ዐ', 'ዑ', 'ዒ', 'ዓ', 'ዔ', 'ዕ', 'ዖ',
  // 22. ዘ
  'ዘ', 'ዙ', 'ዚ', 'ዛ', 'ዜ', 'ዝ', 'ዞ', 'ዟ',
  // 23. ዠ
  'ዠ', 'ዡ', 'ዢ', 'ዣ', 'ዤ', 'ዥ', 'ዦ', 'ዧ',
  // 24. የ
  'የ', 'ዩ', 'ዪ', 'ያ', 'ዬ', 'ይ', 'ዮ',
  // 25. ደ
  'ደ', 'ዱ', 'ዲ', 'ዳ', 'ዴ', 'ድ', 'ዶ', 'ዷ',
  // 26. ጀ
  'ጀ', 'ጁ', 'ጂ', 'ጃ', 'ጄ', 'ጅ', 'ጆ', 'ጇ',
  // 27. ገ
  'ገ', 'ጉ', 'ጊ', 'ጋ', 'ጌ', 'ግ', 'ጎ', 'ጐ', 'ጒ', 'ጓ', 'ጔ', 'ጕ',
  // 28. ጠ
  'ጠ', 'ጡ', 'ጢ', 'ጣ', 'ጤ', 'ጥ', 'ጦ', 'ጧ',
  // 29. ጨ
  'ጨ', 'ጩ', 'ጪ', 'ጫ', 'ጬ', 'ጭ', 'ጮ', 'ጯ',
  // 30. ጰ
  'ጰ', 'ጱ', 'ጲ', 'ጳ', 'ጴ', 'ጵ', 'ጶ', 'ጷ',
  // 31. ጸ
  'ጸ', 'ጹ', 'ጺ', 'ጻ', 'ጼ', 'ጽ', 'ጾ', 'ጿ',
  // 32. ፀ
  'ፀ', 'ፁ', 'ፂ', 'ፃ', 'ፄ', 'ፅ', 'ፆ',
  // 33. ፈ
  'ፈ', 'ፉ', 'ፊ', 'ፋ', 'ፌ', 'ፍ', 'ፎ', 'ፏ',
  // 34. ፐ
  'ፐ', 'ፑ', 'ፒ', 'ፓ', 'ፔ', 'ፕ', 'ፖ', 'ፗ'
];

// Precompute index map for high-speed character comparison
const FIDEL_MAP = new Map<string, number>();
AMHARIC_FIDEL_SERIES.forEach((char, index) => {
  FIDEL_MAP.set(char, index);
});

/**
 * Compares two Amharic strings according to the official Fidel alphabetical order.
 */
export function compareAmharicStrings(strA: string, strB: string): number {
  if (!strA && !strB) return 0;
  if (!strA) return 1;
  if (!strB) return -1;

  const a = strA.trim();
  const b = strB.trim();

  const minLen = Math.min(a.length, b.length);

  for (let i = 0; i < minLen; i++) {
    const charA = a[i];
    const charB = b[i];

    if (charA === charB) continue;

    const rankA = FIDEL_MAP.get(charA);
    const rankB = FIDEL_MAP.get(charB);

    if (rankA !== undefined && rankB !== undefined) {
      return rankA - rankB;
    }

    // Known fidel takes precedence over non-fidel
    if (rankA !== undefined && rankB === undefined) return -1;
    if (rankA === undefined && rankB !== undefined) return 1;

    // Fallback to localeCompare
    const loc = charA.localeCompare(charB, 'am', { sensitivity: 'base' });
    if (loc !== 0) return loc;
  }

  return a.length - b.length;
}

/**
 * Sorts any array of objects with a `name` field in Amharic alphabetical order.
 */
export function sortStudentsByAmharicName<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => compareAmharicStrings(a.name, b.name));
}
