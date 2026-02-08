"use client";

import { useTranslation, useSettings } from "../contexts/SettingsContext";
import ArrowIcon from "../components/icons/ArrowIcon";
import Link from "next/link";

// Custom SVG Icons
const NumberCircle = ({ num }: { num: number }) => (
  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-sm">
    {num}
  </div>
);

const LightbulbIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
    <path d="M9 18h6"/>
    <path d="M10 22h4"/>
  </svg>
);

const CheckmarkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
);

const BrainIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
    <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
    <path d="M6 18a4 4 0 0 1-1.967-.516"/>
    <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
  </svg>
);

export default function HowToStudyPage() {
  const t = useTranslation();
  const { settings } = useSettings();
  const isNorwegian = settings.language === "no";

  const isDarkMode = settings.theme === 'dark' || (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: isDarkMode ? '#0a1628' : '#fafaf9' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors rounded-md hover:bg-white/50 dark:hover:bg-gray-800/50"
          >
            <ArrowIcon direction="left" size={16} />
            <span>{t("back")}</span>
          </Link>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-xl p-8 md:p-12" style={{ border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}>
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
                <NumberCircle num={1} />
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
                <NumberCircle num={2} />
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
                <NumberCircle num={3} />
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
                <NumberCircle num={4} />
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
            <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-md border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-amber-500"><LightbulbIcon /></span>
                {isNorwegian ? "Pro-tips" : "Pro Tips"}
              </h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1"><CheckmarkIcon /></span>
                  <span>
                    {isNorwegian 
                      ? "Start med å skumme gjennom alle kortene før du begynner å memorere."
                      : "Start by skimming through all cards before memorizing."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1"><CheckmarkIcon /></span>
                  <span>
                    {isNorwegian 
                      ? "Fokuser ekstra på kortene du synes er vanskelige."
                      : "Focus extra on the cards you find difficult."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1"><CheckmarkIcon /></span>
                  <span>
                    {isNorwegian 
                      ? "Forklar svaret høyt for deg selv – det hjelper!"
                      : "Explain the answer out loud to yourself – it helps!"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1"><CheckmarkIcon /></span>
                  <span>
                    {isNorwegian 
                      ? "Ta quiz-en flere ganger for å styrke langtidshukommelsen."
                      : "Take the quiz multiple times to strengthen long-term memory."}
                  </span>
                </li>
              </ul>
            </div>

            {/* Study Science Box */}
            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-purple-500"><BrainIcon /></span>
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
              className="inline-flex items-center gap-2 px-8 py-4 rounded-md text-white font-bold text-lg transition-all hover:scale-105 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)' }}
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
