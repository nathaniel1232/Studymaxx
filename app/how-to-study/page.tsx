"use client";

import { useTranslation, useSettings } from "../contexts/SettingsContext";
import ArrowIcon from "../components/icons/ArrowIcon";
import Link from "next/link";

export default function HowToStudyPage() {
  const t = useTranslation();
  const { settings } = useSettings();
  const isNorwegian = settings.language === "no";

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: 'var(--background)' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors rounded-full hover:bg-white/50 dark:hover:bg-gray-800/50"
          >
            <ArrowIcon direction="left" size={16} />
            <span>{t("back")}</span>
          </Link>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 md:p-12" style={{ border: '1px solid var(--border)' }}>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {isNorwegian ? "Slik studerer du med StudyMaxx" : "How to Study with StudyMaxx"}
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
            {isNorwegian 
              ? "En enkel guide for å lære mest mulig" 
              : "A simple guide to maximize your learning"}
          </p>

          <div className="space-y-8">
            {/* Step 1 */}
            <section className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <span className="text-2xl">1️⃣</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {isNorwegian ? "Lim inn notatene dine" : "Paste Your Notes"}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {isNorwegian 
                    ? "Kopier teksten fra forelesningsnotatene, læreboka eller presentasjonene dine. Jo mer relevant innhold, jo bedre flashcards får du."
                    : "Copy text from your lecture notes, textbook, or slides. The more relevant content you provide, the better flashcards you'll get."}
                </p>
              </div>
            </section>

            {/* Step 2 */}
            <section className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <span className="text-2xl">2️⃣</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {isNorwegian ? "AI lager flashcards for deg" : "AI Creates Flashcards"}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {isNorwegian 
                    ? "StudyMaxx sin AI analyserer teksten og lager spørsmål som tester forståelsen din – ikke bare definisjoner, men sammenhenger og konsepter."
                    : "StudyMaxx's AI analyzes your text and creates questions that test real understanding – not just definitions, but connections and concepts."}
                </p>
              </div>
            </section>

            {/* Step 3 */}
            <section className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <span className="text-2xl">3️⃣</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {isNorwegian ? "Bla gjennom kortene" : "Flip Through Cards"}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {isNorwegian 
                    ? "Les spørsmålet, tenk på svaret, og snu kortet for å sjekke. Denne aktive gjenkallelsen styrker hukommelsen din mye bedre enn å bare lese."
                    : "Read the question, think of the answer, then flip the card to check. This active recall strengthens your memory much better than passive reading."}
                </p>
              </div>
            </section>

            {/* Step 4 */}
            <section className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                <span className="text-2xl">4️⃣</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {isNorwegian ? "Test deg selv" : "Test Yourself"}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {isNorwegian 
                    ? "Når du føler deg klar, bruk quiz-funksjonen. Hvert spørsmål har flere valg – og feil svar er designet for å ligne riktige, så du må virkelig kunne stoffet."
                    : "When you feel ready, use the quiz mode. Each question has multiple choices – wrong answers are designed to look plausible, so you really need to know your stuff."}
                </p>
              </div>
            </section>

            {/* Step 5 */}
            <section className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
                <span className="text-2xl">5️⃣</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {isNorwegian ? "Gjenta over tid" : "Repeat Over Time"}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {isNorwegian 
                    ? "Det beste tipset: Studer i korte økter over flere dager i stedet for én lang kveld. Hjernen din trenger tid til å bearbeide informasjonen."
                    : "The best tip: Study in short sessions over several days instead of one long night. Your brain needs time to process the information."}
                </p>
              </div>
            </section>

            {/* Pro Tips Box */}
            <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>💡</span>
                {isNorwegian ? "Pro-tips" : "Pro Tips"}
              </h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>
                    {isNorwegian 
                      ? "Start med å skumme gjennom alle kortene før du begynner å memorere."
                      : "Start by skimming through all cards before memorizing."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>
                    {isNorwegian 
                      ? "Fokuser ekstra på kortene du synes er vanskelige."
                      : "Focus extra on the cards you find difficult."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>
                    {isNorwegian 
                      ? "Forklar svaret høyt for deg selv – det hjelper!"
                      : "Explain the answer out loud to yourself – it helps!"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>
                    {isNorwegian 
                      ? "Ta quiz-en flere ganger for å styrke langtidshukommelsen."
                      : "Take the quiz multiple times to strengthen long-term memory."}
                  </span>
                </li>
              </ul>
            </div>

            {/* Study Science Box */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span>🧠</span>
                {isNorwegian ? "Hvorfor dette fungerer" : "Why This Works"}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {isNorwegian 
                  ? "StudyMaxx bruker to forskningsbaserte læringsteknikker: aktiv gjenkalling (å hente informasjon fra hukommelsen) og repetert læring. Studier viser at disse metodene er mye mer effektive enn å bare lese og markere tekst."
                  : "StudyMaxx uses two research-backed learning techniques: active recall (retrieving information from memory) and spaced repetition. Studies show these methods are much more effective than just reading and highlighting text."}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white font-bold text-lg transition-all hover:scale-105 shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}
            >
              {isNorwegian ? "Start å studere nå" : "Start Studying Now"}
              <ArrowIcon direction="right" size={20} />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
