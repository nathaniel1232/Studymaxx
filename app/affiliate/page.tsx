"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "../contexts/SettingsContext";

export default function AffiliatePage() {
  const router = useRouter();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    tiktokHandle: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('[Affiliate Form] Submitting:', formData);
      const response = await fetch('/api/affiliate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      console.log('[Affiliate Form] Response status:', response.status);
      const responseData = await response.json();
      console.log('[Affiliate Form] Response data:', responseData);

      if (response.ok) {
        console.log('[Affiliate Form] Success! Application submitted.');
        setSubmitted(true);
        setFormData({ fullName: '', email: '', tiktokHandle: '', message: '' });
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        console.error('[Affiliate Form] Error:', responseData);
        alert('Error submitting application: ' + (responseData?.details || responseData?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[Affiliate Form] Failed to submit affiliate form:', error);
      alert('Network error: ' + String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen py-12 px-6 ${isDark ? 'bg-[#1a1a2e] text-white' : 'bg-white text-black'}`}>
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-8 px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
            color: '#8b5cf6',
            border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'}`
          }}
        >
          ← Back
        </button>

        {submitted ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
            <p style={{ color: isDark ? '#aaa' : '#666', marginBottom: '16px' }}>
              We've received your affiliate application. Our team will review it and get back to you soon.
            </p>
            <p style={{ color: isDark ? '#888' : '#999', fontSize: '14px' }}>
              Redirecting you back home...
            </p>
          </div>
        ) : (
          <>
            <div className="mb-12">
              <h1 className="text-4xl font-bold mb-4">💼 Become a StudyMaxx Affiliate</h1>
              <p style={{ color: isDark ? '#aaa' : '#666', fontSize: '18px' }}>
                Earn recurring commissions by promoting StudyMaxx to your audience. Whether you create content on TikTok, YouTube, or any other platform, we'll reward you for bringing quality users to our product.
              </p>
            </div>

            {/* Program Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)',
                  border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'}`
                }}
              >
                <h3 className="text-xl font-bold mb-2">Customer Incentive</h3>
                <p style={{ color: isDark ? '#999' : '#666', fontSize: '14px' }}>
                  Give your followers <strong>15% off their first month</strong> with a unique referral code.
                </p>
              </div>
              <div
                className="p-6 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(217, 70, 239, 0.15))',
                  border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(217, 70, 239, 0.2)'}`
                }}
              >
                <h3 className="text-xl font-bold mb-2">Your Commission</h3>
                <p style={{ color: isDark ? '#999' : '#666', fontSize: '14px' }}>
                  Earn <strong>20% recurring commission</strong> every month they stay subscribed. Unlimited earning potential.
                </p>
              </div>
            </div>

            {/* Application Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-2xl font-bold">Apply Now</h2>

              <div>
                <label htmlFor="fullName" className="block font-semibold mb-2">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: isDark ? '#2a2a3e' : '#f9f9f9',
                    borderColor: isDark ? '#444' : '#ddd',
                    color: isDark ? '#fff' : '#000'
                  }}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block font-semibold mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: isDark ? '#2a2a3e' : '#f9f9f9',
                    borderColor: isDark ? '#444' : '#ddd',
                    color: isDark ? '#fff' : '#000'
                  }}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="tiktokHandle" className="block font-semibold mb-2">
                  TikTok Handle / Social Media
                </label>
                <input
                  id="tiktokHandle"
                  type="text"
                  name="tiktokHandle"
                  value={formData.tiktokHandle}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: isDark ? '#2a2a3e' : '#f9f9f9',
                    borderColor: isDark ? '#444' : '#ddd',
                    color: isDark ? '#fff' : '#000'
                  }}
                  placeholder="@yourhandle or your profile URL"
                />
              </div>

              <div>
                <label htmlFor="message" className="block font-semibold mb-2">
                  Tell Us About Yourself (Optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: isDark ? '#2a2a3e' : '#f9f9f9',
                    borderColor: isDark ? '#444' : '#ddd',
                    color: isDark ? '#fff' : '#000'
                  }}
                  placeholder="Share your content strategy, audience size, or why you'd be a great fit for the program..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg font-bold transition-all duration-200"
                style={{
                  background: isSubmitting
                    ? 'linear-gradient(135deg, #8b5cf6, #d946ef) opacity-70'
                    : 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                  color: '#ffffff',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>

            <p style={{ color: isDark ? '#888' : '#999', fontSize: '14px', marginTop: '24px', textAlign: 'center' }}>
              Application submitted? We'll review and get back to you within 48 hours.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
