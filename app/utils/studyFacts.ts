/**
 * Evidence-based study facts with sources
 * These facts explain why StudyMaxx methods work
 */

import { Language } from "../contexts/SettingsContext";

export interface StudyFact {
  id: string;
  text: Partial<Record<Language, string>>;
  source: Partial<Record<Language, string>>;
  context: "general" | "flashcards" | "testing" | "spaced-repetition";
}

export const studyFacts: StudyFact[] = [
  {
    id: "testing-effect",
    text: {
      en: "Self-testing improves learning more than passive reading. Taking practice tests strengthens memory and helps you remember information longer."
    },
    source: {
      en: "Testing Effect (Roediger & Butler, 2011)"
    },
    context: "testing"
  },
  {
    id: "active-recall",
    text: {
      en: "Flashcards are effective because they use active recall — a learning method proven to strengthen memory by forcing your brain to retrieve information."
    },
    source: {
      en: "Cognitive Psychology Research"
    },
    context: "flashcards"
  },
  {
    id: "spaced-repetition",
    text: {
      en: "Repeated review over time (spaced repetition) helps information stick. Spreading study sessions over days or weeks is more effective than cramming."
    },
    source: {
      en: "Spaced Repetition Research (Ebbinghaus, Cepeda et al.)"
    },
    context: "spaced-repetition"
  },
  {
    id: "retrieval-practice",
    text: {
      en: "Trying to recall information strengthens memory more than simply re-reading notes. This is called retrieval practice."
    },
    source: {
      en: "Cognitive Science of Learning"
    },
    context: "general"
  },
  {
    id: "generation-effect",
    text: {
      en: "Creating your own study materials helps you understand and remember better than using pre-made content. The act of generating questions deepens learning."
    },
    source: {
      en: "Generation Effect (Slamecka & Graf, 1978)"
    },
    context: "flashcards"
  },
  {
    id: "desirable-difficulties",
    text: {
      en: "Learning feels harder when you test yourself, but that struggle actually strengthens memory. Easy studying doesn't always mean effective studying."
    },
    source: {
      en: "Desirable Difficulties (Bjork, 1994)"
    },
    context: "testing"
  },
  {
    id: "feedback-timing",
    text: {
      en: "Getting immediate feedback on your answers helps you correct mistakes and reinforces correct information, making learning more efficient."
    },
    source: {
      en: "Educational Psychology Research"
    },
    context: "testing"
  },
  {
    id: "metacognition",
    text: {
      en: "Self-testing helps you identify what you actually know versus what you only think you know. This awareness improves study effectiveness."
    },
    source: {
      en: "Metacognition Research (Dunlosky & Metcalfe)"
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
    text: fact.text[language] || fact.text["en"] || "Study tip",
    source: fact.source[language] || fact.source["en"] || "Research"
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
      text: fact.text[language] || fact.text["en"] || "Study tip",
      source: fact.source[language] || fact.source["en"] || "Research"
    }));
}
