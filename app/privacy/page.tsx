"use client";

import { useTranslation, useSettings } from "../contexts/SettingsContext";
import ArrowIcon from "../components/icons/ArrowIcon";
import Link from "next/link";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Last updated: February 24, 2026
          </p>

          <div className="space-y-6 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                1. Information We Collect
              </h2>
              <p className="mb-3">
                StudyMaxx is designed with your privacy in mind. We collect minimal information to provide our service:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Study content:</strong> Notes, PDFs, documents, images, and other materials you upload are processed to generate flashcards. This content is sent to OpenAI's API for processing only.</li>
                <li><strong>Study sessions and time tracking:</strong> When you use the study features, we track session duration, topics studied, and study goals to help you monitor your learning progress.</li>
                <li><strong>Exam dates and study plans:</strong> If you provide exam dates and create a study plan (premium feature), we store this information to generate a personalized study schedule.</li>
                <li><strong>Account data:</strong> If you create an account (via email or Google OAuth), we store your email address, authentication tokens, profile information, and premium subscription status securely.</li>
                <li><strong>Payment information:</strong> Payments are processed through Stripe. We do not store your credit card information directly—Stripe handles this securely according to PCI-DSS standards.</li>
                <li><strong>Local storage:</strong> Your flashcard sets, preferences, and settings are stored locally in your browser and synced to our server if you have an account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To generate flashcards and quiz questions from your study materials using AI</li>
                <li>To create personalized study plans for upcoming exams (premium)</li>
                <li>To track your study time and progress toward your daily goals</li>
                <li>To help with math problems through MathMaxx (AI math tutor)</li>
                <li>To save your progress and preferences across devices</li>
                <li>To manage your premium subscription and process payments</li>
                <li>To improve our service, fix bugs, and understand user behavior</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                3. Data Sharing
              </h2>
              <p className="mb-3">
                We do not sell or share your personal information with third parties for marketing purposes. Your data is shared only with service providers necessary to operate StudyMaxx:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>OpenAI API:</strong> Your study content is sent to OpenAI's API for AI processing to generate flashcards and answer questions. OpenAI's privacy policy applies.</li>
                <li><strong>Stripe:</strong> Payment processing is handled by Stripe. Your email and subscription status are shared with Stripe; credit card data is stored only by Stripe.</li>
                <li><strong>Supabase:</strong> If you have an account, authentication and data storage are handled by Supabase (Firebase alternative).</li>
                <li><strong>Google OAuth:</strong> If you sign in with Google, your basic profile information (email, name) is used for account creation only.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                4. Data Security
              </h2>
              <p className="mb-3">
                We implement industry-standard security measures:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>All data is transmitted securely using HTTPS (TLS encryption)</li>
                <li>Account authentication uses secure OAuth 2.0 and JWT tokens</li>
                <li>Passwords are hashed and never stored in plain text</li>
                <li>Database access is restricted and monitored</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                5. Your Rights
              </h2>
              <p className="mb-3">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access and download your data in a portable format</li>
                <li>Delete your account and all associated data</li>
                <li>Clear your local browser storage and recent study history</li>
                <li>Opt out of email communications (except essential account notifications)</li>
                <li>Withdraw consent for data processing at any time</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, contact us at{" "}
                <a href="mailto:studymaxxer@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  studymaxxer@gmail.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                6. Cookies and Local Storage
              </h2>
              <p className="mb-3">
                We use the following:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Session tokens:</strong> Used for authentication and account security</li>
                <li><strong>Local storage:</strong> Stores your preferences, theme, language, study sets, and progress</li>
                <li><strong>Analytics:</strong> We do not use third-party analytics or tracking cookies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                7. GDPR and Data Protection
              </h2>
              <p className="mb-3">
                For users in the EU/EEA, StudyMaxx complies with GDPR:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We process data based on user consent and legitimate business interests</li>
                <li>You can request data deletion or portability at any time</li>
                <li>We do not engage in automated decision-making that affects you</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                8. Children's Privacy
              </h2>
              <p>
                StudyMaxx is intended for students aged 13 and above. We do not knowingly collect personal information from children under 13 without parental consent. If you believe we have collected data from a child under 13, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                9. Changes to This Policy
              </h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of significant changes via email or by posting a notice on the website. Continued use of the service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                10. Contact Us
              </h2>
              <p>
                If you have questions about this privacy policy or how we handle your data, please contact us at{" "}
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
