"use client";

import { useTranslation } from "../contexts/SettingsContext";
import ArrowIcon from "../components/icons/ArrowIcon";
import Link from "next/link";

export default function PrivacyPage() {
  const t = useTranslation();

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
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-xl p-8 md:p-12" style={{ border: '1px solid var(--border)' }}>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Last updated: December 23, 2025
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
                <li><strong>Study content:</strong> Notes, PDFs, and other materials you upload are processed to generate flashcards. This content is sent to our AI service (OpenAI GPT-4o mini) for processing only.</li>
                <li><strong>Local storage:</strong> Your flashcard sets and settings are stored locally in your browser. We do not store this data on our servers.</li>
                <li><strong>Optional account data:</strong> If you create an account (Supabase), we store your email address and authentication tokens securely.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To generate flashcards and quiz questions from your study materials</li>
                <li>To save your progress and preferences locally</li>
                <li>To sync your data across devices (if you create an account)</li>
                <li>To improve our service and user experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                3. Data Sharing
              </h2>
              <p className="mb-3">
                We do not sell or share your personal information with third parties. However:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>OpenAI API:</strong> Your study content is sent to OpenAI's API for AI processing to generate flashcards. OpenAI's privacy policy applies to this data.</li>
                <li><strong>Supabase:</strong> If you create an account, authentication and data storage is handled by Supabase.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                4. Data Security
              </h2>
              <p>
                We implement security measures to protect your data. Your study materials are transmitted securely (HTTPS), and account authentication uses industry-standard encryption.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                5. Your Rights
              </h2>
              <p className="mb-3">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access and download your data</li>
                <li>Delete your account and associated data</li>
                <li>Clear your local browser storage at any time</li>
                <li>Opt out of any optional data collection</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                6. Cookies and Tracking
              </h2>
              <p>
                We use local storage to save your preferences and study sets. We do not use tracking cookies or analytics services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                7. Changes to This Policy
              </h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any significant changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                8. Contact Us
              </h2>
              <p>
                If you have questions about this privacy policy, please contact us at{" "}
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
