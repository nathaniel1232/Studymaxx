/**
 * Evidence-based study facts with sources
 * These facts explain why StudyMaxx methods work
 */

import { Language } from "../contexts/SettingsContext";

export interface StudyFact {
  id: string;
  text: Record<Language, string>;
  source: Record<Language, string>;
  context: "general" | "flashcards" | "testing" | "spaced-repetition";
}

export const studyFacts: StudyFact[] = [
  {
    id: "testing-effect",
    text: {
      en: "Self-testing improves learning more than passive reading. Taking practice tests strengthens memory and helps you remember information longer.",
      no: "Selvtesting forbedrer læring mer enn passiv lesing. Å ta prøvetester styrker hukommelsen og hjelper deg å huske informasjon lenger."
    },
    source: {
      en: "Testing Effect (Roediger & Butler, 2011)",
      no: "Testeffekten (Roediger & Butler, 2011)"
    },
    context: "testing"
  },
  {
    id: "active-recall",
    text: {
      en: "Flashcards are effective because they use active recall — a learning method proven to strengthen memory by forcing your brain to retrieve information.",
      no: "Kunnskapskort er effektive fordi de bruker aktiv gjenkalling — en læringsmetode som er bevist å styrke hukommelsen ved å tvinge hjernen din til å hente informasjon."
    },
    source: {
      en: "Cognitive Psychology Research",
      no: "Kognitiv psykologiforskning"
    },
    context: "flashcards"
  },
  {
    id: "spaced-repetition",
    text: {
      en: "Repeated review over time (spaced repetition) helps information stick. Spreading study sessions over days or weeks is more effective than cramming.",
      no: "Gjentatt gjennomgang over tid (fordelt repetisjon) hjelper informasjon å feste seg. Å spre studieøkter over dager eller uker er mer effektivt enn å puggе."
    },
    source: {
      en: "Spaced Repetition Research (Ebbinghaus, Cepeda et al.)",
      no: "Fordelt repetisjonsforskning (Ebbinghaus, Cepeda et al.)"
    },
    context: "spaced-repetition"
  },
  {
    id: "retrieval-practice",
    text: {
      en: "Trying to recall information strengthens memory more than simply re-reading notes. This is called retrieval practice.",
      no: "Å prøve å huske informasjon styrker hukommelsen mer enn å bare lese notater på nytt. Dette kalles gjenkallingsøvelse."
    },
    source: {
      en: "Cognitive Science of Learning",
      no: "Kognitiv læringsvitenskap"
    },
    context: "general"
  },
  {
    id: "generation-effect",
    text: {
      en: "Creating your own study materials helps you understand and remember better than using pre-made content. The act of generating questions deepens learning.",
      no: "Å lage ditt eget studiemateriell hjelper deg å forstå og huske bedre enn å bruke ferdiglaget innhold. Handlingen med å generere spørsmål fordyper læringen."
    },
    source: {
      en: "Generation Effect (Slamecka & Graf, 1978)",
      no: "Genereringseffekten (Slamecka & Graf, 1978)"
    },
    context: "flashcards"
  },
  {
    id: "desirable-difficulties",
    text: {
      en: "Learning feels harder when you test yourself, but that struggle actually strengthens memory. Easy studying doesn't always mean effective studying.",
      no: "Læring føles vanskeligere når du tester deg selv, men den kampen styrker faktisk hukommelsen. Enkel studering betyr ikke alltid effektiv studering."
    },
    source: {
      en: "Desirable Difficulties (Bjork, 1994)",
      no: "Ønskelige vanskeligheter (Bjork, 1994)"
    },
    context: "testing"
  },
  {
    id: "feedback-timing",
    text: {
      en: "Getting immediate feedback on your answers helps you correct mistakes and reinforces correct information, making learning more efficient.",
      no: "Å få umiddelbar tilbakemelding på svarene dine hjelper deg å rette feil og forsterker riktig informasjon, noe som gjør læringen mer effektiv."
    },
    source: {
      en: "Educational Psychology Research",
      no: "Pedagogisk psykologiforskning"
    },
    context: "testing"
  },
  {
    id: "metacognition",
    text: {
      en: "Self-testing helps you identify what you actually know versus what you only think you know. This awareness improves study effectiveness.",
      no: "Selvtesting hjelper deg å identifisere hva du faktisk vet kontra hva du bare tror du vet. Denne bevisstheten forbedrer studieeffektiviteten."
    },
    source: {
      en: "Metacognition Research (Dunlosky & Metcalfe)",
      no: "Metakognisjonsforskning (Dunlosky & Metcalfe)"
    },
    context: "general"
  }
];

/**
 * Get a random study fact for a specific context
 */
export function getStudyFact(context?: StudyFact["context"], language: Language = "en"): { text: string; source: string; id: string } {
  const filtered = context 
    ? studyFacts.filter(fact => fact.context === context || fact.context === "general")
    : studyFacts;
  
  const fact = filtered[Math.floor(Math.random() * filtered.length)];
  return {
    id: fact.id,
    text: fact.text[language],
    source: fact.source[language]
  };
}

/**
 * Get all facts for a specific context
 */
export function getStudyFactsByContext(context: StudyFact["context"], language: Language = "en"): { text: string; source: string; id: string }[] {
  return studyFacts
    .filter(fact => fact.context === context)
    .map(fact => ({
      id: fact.id,
      text: fact.text[language],
      source: fact.source[language]
    }));
}
