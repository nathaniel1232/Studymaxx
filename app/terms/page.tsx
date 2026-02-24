"use client";

import { useTranslation, useSettings } from "../contexts/SettingsContext";
import ArrowIcon from "../components/icons/ArrowIcon";
import Link from "next/link";

export default function TermsPage() {
  const t = useTranslation();
  const { settings } = useSettings();
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
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Terms of Service
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Last updated: February 24, 2026
          </p>

          <div className="space-y-6 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using StudyMaxx ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                2. Description of Service
              </h2>
              <p className="mb-3">
                StudyMaxx is an AI-powered study platform that helps students learn more effectively. Features include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Flashcard creation:</strong> Generate flashcards from notes, PDFs, documents, images, and URLs using AI</li>
                <li><strong>Study modes:</strong> Flashcard study, quiz questions, matching games, and more</li>
                <li><strong>AI math tutor (MathMaxx):</strong> Get help solving math problems step-by-step</li>
                <li><strong>Study planning (premium):</strong> Create personalized study plans for upcoming exams</li>
                <li><strong>Study time tracking:</strong> Monitor your study sessions and daily goals</li>
                <li><strong>Progress tracking:</strong> See your learning progress across study sets</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                3. Account Registration
              </h2>
              <p className="mb-3">
                To use premium features, you must create an account by:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Providing a valid email address, or</li>
                <li>Using Google OAuth for single sign-on</li>
              </ul>
              <p className="mt-3">
                You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                4. User Responsibilities
              </h2>
              <p className="mb-3">
                You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service only for lawful educational purposes</li>
                <li>Not upload or share content that infringes on others' intellectual property rights (copyrighted textbooks, exam answers, etc.)</li>
                <li>Not attempt to reverse engineer, hack, or misuse the Service or its infrastructure</li>
                <li>Keep your account credentials and authentication tokens secure</li>
                <li>Not share your account with others or sell access to the Service</li>
                <li>Comply with all applicable laws in your jurisdiction</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                5. Content Ownership
              </h2>
              <p>
                You retain all rights to the content you upload. By using StudyMaxx, you grant us a limited, non-exclusive license to process, store, and display your content for the purpose of providing the Service and creating AI-generated study materials (flashcards, quizzes).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                6. AI-Generated Content
              </h2>
              <p className="mb-3">
                StudyMaxx uses AI to generate flashcards, quiz questions, and study plans. Please note:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>AI-generated content may contain errors or inaccuracies</li>
                <li>You are responsible for verifying the accuracy of study materials before using them for exams</li>
                <li>AI responses for math problems (MathMaxx) may contain mistakes; always double-check logic and calculations</li>
                <li>StudyMaxx is designed as a study aid, not as an official answer key or exam solution provider</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                7. Premium Subscription and Billing
              </h2>
              <p className="mb-3">
                <strong>Pricing and Billing:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Premium plans are billed monthly ($5.99/month) or yearly ($52.99/year)</li>
                <li>Payments are processed through Stripe and are non-refundable</li>
                <li>Promotional offers (e.g., first month $4.99) are limited-time and automatic for new users within the campaign period</li>
                <li>Your subscription will auto-renew unless you cancel it at least 24 hours before renewal</li>
                <li>You can cancel your subscription anytime; you'll retain access until the end of your current billing period</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                8. Free vs. Premium Features
              </h2>
              <p className="mb-3">
                <strong>Free plan includes:</strong> Flashcard creation (limited), study modes, basic AI features
              </p>
              <p className="mb-3">
                <strong>Premium plan includes:</strong> Unlimited flashcard sets, unlimited file uploads (PDFs, images, documents), personalized exam study plans, study time tracking with goals, MathMaxx (AI math tutor), all difficulty levels, cross-device sync
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                9. Limitation of Liability
              </h2>
              <p className="mb-3">
                StudyMaxx and its creators are not liable for any damages, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Errors or inaccuracies in AI-generated content</li>
                <li>Loss of data or study progress</li>
                <li>Academic outcomes or exam performance</li>
                <li>Service interruptions or downtime</li>
                <li>Unauthorized access to your account</li>
              </ul>
              <p className="mt-3">
                The Service is provided "as is" without warranties of any kind.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                10. Academic Integrity
              </h2>
              <p>
                StudyMaxx is designed as an educational study aid. You are responsible for ensuring that your use of the Service complies with your school's or institution's academic integrity policies. Using StudyMaxx to cheat on exams or assignments may violate those policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                11. Termination of Account
              </h2>
              <p className="mb-3">
                We reserve the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Suspend or terminate your access to the Service at any time for violation of these Terms</li>
                <li>Delete accounts that have been inactive for 12 months</li>
                <li>Modify or discontinue the Service with or without notice</li>
              </ul>
              <p className="mt-3">
                Upon termination, your right to use the Service immediately ceases, though you may request to download your data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                12. Third-Party Services
              </h2>
              <p className="mb-3">
                The Service uses third-party APIs and services:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>OpenAI:</strong> Processes your study content to generate flashcards (OpenAI Terms apply)</li>
                <li><strong>Stripe:</strong> Handles payment processing (Stripe Services Agreement applies)</li>
                <li><strong>Supabase:</strong> Provides database and authentication services (Supabase ToS apply)</li>
                <li><strong>Google OAuth:</strong> Used for account sign-in (Google Privacy Policy applies)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                13. Changes to Terms
              </h2>
              <p>
                We may update these Terms of Service at any time. We will notify you of material changes via email or by posting a notice on the website. Continued use of the Service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                14. Governing Law and Disputes
              </h2>
              <p>
                These Terms are governed by the laws of Norway. Any disputes shall be resolved in Norwegian courts.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                15. Contact
              </h2>
              <p>
                For questions about these Terms, contact us at{" "}
                <a href="mailto:studymaxxer@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  studymaxxer@gmail.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
