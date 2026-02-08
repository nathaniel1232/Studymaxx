"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// FAQ data
const faqs = [
  {
    question: "How do I create flashcards?",
    answer: "Click 'Create Free Study Set' on the homepage, then add your content by typing notes, pasting text, uploading a PDF, linking a YouTube video, or recording audio. Our AI will automatically generate flashcards from your content."
  },
  {
    question: "What content formats are supported?",
    answer: "StudyMaxx supports: typed/pasted text, PDF documents, images with text (OCR), YouTube videos (via transcript), and audio recordings (MP3, WAV, M4A). You can mix multiple sources in one study set."
  },
  {
    question: "Is my data private and secure?",
    answer: "Yes! Your study materials are stored securely and never sold or used to train AI models. We use industry-standard encryption and only process your content to create your personal study materials."
  },
  {
    question: "What's the difference between Free and Premium?",
    answer: "Free users can create up to 2 study sets per day with basic features (10 cards, Medium difficulty, auto language). Premium unlocks unlimited study sets, up to 50 cards per set, custom difficulty, language selection, and exclusive features like math problem support and custom study modes."
  },
  {
    question: "How do quizzes work?",
    answer: "After creating flashcards, click 'Quiz' mode to test yourself with auto-generated multiple choice questions. The AI creates challenging questions based on your flashcard content to help reinforce your learning."
  },
  {
    question: "Can I study on multiple devices?",
    answer: "Yes! Your study sets sync across all devices automatically when you're signed in. Create flashcards on your laptop and review them on your phone."
  },
  {
    question: "How do I cancel my Premium subscription?",
    answer: "Go to Settings > Manage Subscription to cancel anytime. You'll keep Premium access until the end of your billing period. No hidden fees or hassle."
  },
  {
    question: "What if the AI generates incorrect flashcards?",
    answer: "You can edit any flashcard after generation. Click on a card to modify the question or answer. The AI learns from complex content, but human review is always recommended for accuracy."
  }
];

export default function HelpPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState<'general' | 'bug' | 'feature'>('general');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    // Check system preference and localStorage
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setIsDarkMode(savedMode === 'true');
    } else {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call - replace with actual API endpoint
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In production, you would send this to your backend
    console.log('Feedback submitted:', { type: feedbackType, message: feedbackMessage, email: feedbackEmail });
    
    setIsSubmitting(false);
    setSubmitSuccess(true);
    setFeedbackMessage('');
    setFeedbackEmail('');
    
    // Reset success message after 3 seconds
    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: isDarkMode ? '#1a1a2e' : '#f1f5f9' }}
    >
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4" style={{ 
        backgroundColor: isDarkMode ? 'rgba(26, 26, 46, 0.9)' : 'rgba(241, 245, 249, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.08)'
      }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1a73e8' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-xl font-bold" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>StudyMaxx</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                const newMode = !isDarkMode;
                setIsDarkMode(newMode);
                localStorage.setItem('darkMode', String(newMode));
              }}
              className="p-2 rounded-lg transition-colors"
              style={{ 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                color: isDarkMode ? '#9aa0a6' : '#5f6368'
              }}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium rounded-full transition-all hover:shadow-md"
              style={{ backgroundColor: '#1a73e8', color: '#ffffff' }}
            >
              Back to App
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
            Help & <span style={{ color: '#1a73e8' }}>Community</span>
          </h1>
          <p className="text-lg" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
            Find answers to common questions or reach out to us directly
          </p>
        </div>

        {/* FAQ Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
            <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(26, 115, 232, 0.1)' }}>
              <svg className="w-5 h-5" style={{ color: '#1a73e8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="rounded-2xl overflow-hidden transition-all"
                style={{ 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff',
                  border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)'
                }}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left transition-colors"
                  style={{ 
                    backgroundColor: openFaq === index 
                      ? (isDarkMode ? 'rgba(26, 115, 232, 0.08)' : 'rgba(26, 115, 232, 0.05)') 
                      : 'transparent'
                  }}
                >
                  <span className="font-medium pr-4" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
                    {faq.question}
                  </span>
                  <svg 
                    className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`}
                    style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {openFaq === index && (
                  <div 
                    className="px-6 pb-4"
                    style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Feedback Form Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
            <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(52, 168, 83, 0.1)' }}>
              <svg className="w-5 h-5" style={{ color: '#34a853' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </span>
            Send Feedback
          </h2>
          
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)'
            }}
          >
            {submitSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(52, 168, 83, 0.1)' }}>
                  <svg className="w-8 h-8" style={{ color: '#34a853' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
                  Thank you for your feedback!
                </h3>
                <p style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
                  We appreciate you taking the time to help us improve.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback}>
                {/* Feedback Type */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
                    What type of feedback is this?
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { value: 'general', label: '💬 General', color: '#1a73e8' },
                      { value: 'bug', label: '🐛 Bug Report', color: '#ea4335' },
                      { value: 'feature', label: '✨ Feature Request', color: '#34a853' }
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFeedbackType(type.value as typeof feedbackType)}
                        className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                        style={{ 
                          backgroundColor: feedbackType === type.value 
                            ? type.color 
                            : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                          color: feedbackType === type.value 
                            ? '#ffffff' 
                            : (isDarkMode ? '#9aa0a6' : '#5f6368'),
                          border: feedbackType === type.value 
                            ? `2px solid ${type.color}`
                            : (isDarkMode ? '2px solid rgba(255,255,255,0.1)' : '2px solid rgba(0,0,0,0.1)')
                        }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
                    Your message
                  </label>
                  <textarea
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    rows={4}
                    required
                    className="w-full px-4 py-3 rounded-xl text-base resize-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ 
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      color: isDarkMode ? '#e2e8f0' : '#000000',
                      border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                    }}
                  />
                </div>

                {/* Email (optional) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
                    Email <span style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>(optional, for follow-up)</span>
                  </label>
                  <input
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl text-base transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ 
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      color: isDarkMode ? '#e2e8f0' : '#000000',
                      border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
                    }}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !feedbackMessage.trim()}
                  className="w-full px-6 py-3 rounded-full font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: '#1a73e8',
                    color: '#ffffff'
                  }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Feedback'
                  )}
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Contact Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: isDarkMode ? '#e2e8f0' : '#000000' }}>
            <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(234, 67, 53, 0.1)' }}>
              <svg className="w-5 h-5" style={{ color: '#ea4335' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            Contact Us Directly
          </h2>
          
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)'
            }}
          >
            <p className="mb-4" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
              Need more help or have a specific question? Reach out to us directly and we'll get back to you as soon as possible.
            </p>
            
            <a 
              href="mailto:studymaxxer@gmail.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all hover:shadow-md"
              style={{ backgroundColor: '#ea4335', color: '#ffffff' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email studymaxxer@gmail.com
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 text-center" style={{ borderTop: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.08)' }}>
          <p className="text-sm" style={{ color: isDarkMode ? '#9aa0a6' : '#5f6368' }}>
            © 2026 StudyMaxx. Made with 💙 for students everywhere.
          </p>
        </footer>
      </div>
    </div>
  );
}
