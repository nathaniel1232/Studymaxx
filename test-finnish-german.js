/**
 * Test for Finnish vs German language detection
 * Run: node test-finnish-german.js
 */

const finnishSamples = [
  "Tämä on suomalainen teksti. Kaikki sanat ovat pitkiä ja niissä on paljon vokaaleja.",
  "Minä olen opiskelija. Hän on opettaja. Me olemme koulussa yhdessä.",
  "Suomi on kaunis maa. Meillä on paljon järviä ja metsiä.",
  "Koira juoksee kadulla. Kissalla on pitkä häntä. Talo on vanha.",
  "Hyvää huomenta! Kiitos paljon avusta. Tervetuloa Suomeen!",
];

const germanSamples = [
  "Das ist ein deutscher Text. Alle Wörter sind präzise und klar.",
  "Ich bin Student. Er ist Lehrer. Wir sind zusammen in der Schule.",
  "Deutschland ist ein schönes Land. Wir haben viele Städte und Dörfer.",
  "Der Hund läuft auf der Straße. Die Katze hat einen langen Schwanz. Das Haus ist alt.",
  "Guten Morgen! Vielen Dank für die Hilfe. Willkommen in Deutschland!",
];

function detectFinnishCharacteristics(text) {
  const textLower = text.toLowerCase();
  
  // Finnish-specific patterns
  const hasDoubleVowels = /(aa|ee|ii|oo|uu|yy|ää|öö)/.test(textLower);
  const hasFinchChars = /[äö]/.test(textLower);
  const hasGermanß = /ß/.test(textLower);
  
  // Common Finnish words
  const finnishWords = ['ja', 'on', 'ei', 'se', 'että', 'kun', 'mutta', 'tai', 'minä', 'hän'];
  const finnishWordCount = finnishWords.filter(word => 
    new RegExp(`\\b${word}\\b`, 'i').test(text)
  ).length;
  
  return {
    hasDoubleVowels,
    hasFinchChars,
    hasGermanß,
    finnishWordCount,
    isFinnish: hasDoubleVowels && !hasGermanß && finnishWordCount > 0,
  };
}

function detectGermanCharacteristics(text) {
  const textLower = text.toLowerCase();
  
  // German-specific patterns
  const hasGermanß = /ß/.test(textLower);
  const hasGermanChars = /[üöä]/.test(textLower);
  
  // Common German words
  const germanWords = ['der', 'die', 'das', 'und', 'ist', 'ein', 'eine', 'sind', 'ich', 'wir'];
  const germanWordCount = germanWords.filter(word => 
    new RegExp(`\\b${word}\\b`, 'i').test(text)
  ).length;
  
  return {
    hasGermanß,
    hasGermanChars,
    germanWordCount,
    isGerman: (hasGermanß || germanWordCount >= 2) && !/(aa|oo|ii|uu|yy|ää|öö)/.test(textLower),
  };
}

console.log('\n🇫🇮 FINNISH TEXT SAMPLES:');
console.log('═'.repeat(60));
finnishSamples.forEach((text, i) => {
  const analysis = detectFinnishCharacteristics(text);
  console.log(`\nSample ${i + 1}:`);
  console.log(`Text: "${text.substring(0, 50)}..."`);
  console.log(`Analysis:`, analysis);
  console.log(`✅ Detected as Finnish:`, analysis.isFinnish);
});

console.log('\n\n🇩🇪 GERMAN TEXT SAMPLES:');
console.log('═'.repeat(60));
germanSamples.forEach((text, i) => {
  const analysis = detectGermanCharacteristics(text);
  console.log(`\nSample ${i + 1}:`);
  console.log(`Text: "${text.substring(0, 50)}..."`);
  console.log(`Analysis:`, analysis);
  console.log(`✅ Detected as German:`, analysis.isGerman);
});

console.log('\n\n📊 SUMMARY:');
console.log('═'.repeat(60));
const finnishCorrect = finnishSamples.filter(t => detectFinnishCharacteristics(t).isFinnish).length;
const germanCorrect = germanSamples.filter(t => detectGermanCharacteristics(t).isGerman).length;
console.log(`Finnish detection accuracy: ${finnishCorrect}/${finnishSamples.length} (${(finnishCorrect/finnishSamples.length*100).toFixed(0)}%)`);
console.log(`German detection accuracy: ${germanCorrect}/${germanSamples.length} (${(germanCorrect/germanSamples.length*100).toFixed(0)}%)`);
console.log(`\nOverall accuracy: ${(finnishCorrect + germanCorrect)/(finnishSamples.length + germanSamples.length)*100}%`);
