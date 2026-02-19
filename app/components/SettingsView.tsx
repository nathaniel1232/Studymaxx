"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSettings, useTranslation, Theme } from "../contexts/SettingsContext";
import { studyFacts } from "../utils/studyFacts";
import ArrowIcon from "./icons/ArrowIcon";
import { getCurrentUser, signOut, supabase } from "../utils/supabase";

interface SettingsViewProps {
  onBack: () => void;
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const t = useTranslation();
  const { settings, updateTheme, updateLanguage } = useSettings();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'other'>('other');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    setIsLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (currentUser?.user_metadata?.avatar_url) {
        setAvatarUrl(currentUser.user_metadata.avatar_url);
      }

      if (currentUser && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            const response = await fetch('/api/premium/check', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            
            if (response.ok) {
              const premiumData = await response.json();
              setIsPremium(premiumData.isPremium);
            }
          } catch (error) {
            console.error('Error checking premium:', error);
          }
        }
        
        const { data, error } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', currentUser.id)
          .single();

        if (!error && data?.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !supabase) return;
    
    setIsUploadingAvatar(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to upload an avatar');
        return;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAvatarUrl(data.avatarUrl);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
        await supabase.auth.refreshSession();
      } else {
        alert(data.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !supabase || !confirm('Remove profile picture?')) return;
    
    setIsUploadingAvatar(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (response.ok) {
        setAvatarUrl(null);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 2000);
        await supabase.auth.refreshSession();
      }
    } catch (error) {
      console.error('Error removing avatar:', error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    
    setIsSendingFeedback(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: feedbackText,
          email: user?.email || null,
          type: feedbackType
        })
      });
      
      if (response.ok) {
        setFeedbackSent(true);
        setFeedbackText("");
        setTimeout(() => {
          setFeedbackSent(false);
          setShowFeedback(false);
        }, 2000);
      } else {
        alert('Failed to send feedback. Please try again.');
      }
    } catch (e) {
      console.error('Failed to send feedback:', e);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isDark = settings.theme === 'dark' || 
    (settings.theme === 'system' && typeof window !== 'undefined' && 
     window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div style={{ 
      minHeight: '100vh',
      background: isDark ? '#0a0a0a' : '#ffffff',
      color: isDark ? '#ffffff' : '#000000'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '16px 24px',
        borderBottom: isDark ? '1px solid #333' : '1px solid #e5e5e5',
        background: isDark ? '#0a0a0a' : '#ffffff'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '999px',
              background: '#1a73e8',
              color: '#ffffff',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <ArrowIcon direction="left" size={14} />
            Back
          </button>
          
          <div style={{ fontSize: '24px', fontWeight: 900 }}>
            <span style={{ color: '#1a73e8' }}>Study</span>Maxx
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Title */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 900, marginBottom: '8px' }}>
            Settings
          </h1>
          <p style={{ fontSize: '18px', color: isDark ? '#a0a0a0' : '#666666' }}>
            Customize your StudyMaxx experience
          </p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            background: isDark ? '#064e3b' : '#d1fae5',
            border: isDark ? '2px solid #059669' : '2px solid #10b981',
            marginBottom: '24px',
            textAlign: 'center',
            fontWeight: 700,
            color: isDark ? '#34d399' : '#047857'
          }}>
            ✓ Settings saved successfully!
          </div>
        )}

        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Account Section */}
          {!user ? (
            <div style={{
              padding: '48px',
              borderRadius: '16px',
              background: isDark ? '#1a1a1a' : '#f9f9f9',
              border: isDark ? '1px solid #333' : '1px solid #e5e5e5',
              textAlign: 'center'
            }}>
              <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '12px' }}>
                Sign In
              </h2>
              <p style={{ fontSize: '16px', color: isDark ? '#a0a0a0' : '#666666', marginBottom: '24px' }}>
                Create an account to sync your study sets across devices
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('showLogin'))}
                style={{
                  padding: '16px 32px',
                  borderRadius: '999px',
                  background: '#1a73e8',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '16px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Sign In / Create Account
              </button>
            </div>
          ) : (
            <div style={{
              padding: '32px',
              borderRadius: '16px',
              background: isDark ? '#1a1a1a' : '#f9f9f9',
              border: isDark ? '1px solid #333' : '1px solid #e5e5e5'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '24px' }}>
                Your Account
              </h2>

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px', padding: '24px', borderRadius: '12px', background: isDark ? '#0a0a0a' : '#ffffff' }}>
                <div style={{ position: 'relative' }}>
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Profile" 
                      style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', border: isDark ? '4px solid #333' : '4px solid #e5e5e5' }}
                    />
                  ) : (
                    <div style={{
                      width: '96px',
                      height: '96px',
                      borderRadius: '50%',
                      background: '#1a73e8',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '36px',
                      fontWeight: 900,
                      border: isDark ? '4px solid #333' : '4px solid #e5e5e5'
                    }}>
                      {user.email?.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '32px', height: '32px', border: '3px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      background: isDark ? '#333' : '#e5e5e5',
                      color: isDark ? '#ffffff' : '#000000',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      marginBottom: '8px',
                      minHeight: '44px'
                    }}
                  >
                    {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {avatarUrl && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        minHeight: '44px'
                      }}
                    >
                      Remove Photo
                    </button>
                  )}
                  <p style={{ fontSize: '12px', color: isDark ? '#666' : '#999', marginTop: '8px', textAlign: 'center' }}>
                    JPG, PNG, GIF or WebP • Max 2MB
                  </p>
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '12px', background: isDark ? '#0a0a0a' : '#ffffff' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: isDark ? '#666' : '#999', marginBottom: '8px' }}>
                  Email Address
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  {user.email}
                </div>
              </div>

              {/* Premium Status */}
              <div style={{
                marginBottom: '24px',
                padding: '20px',
                borderRadius: '12px',
                background: isPremium ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))' : (isDark ? '#0a0a0a' : '#ffffff'),
                border: isPremium ? '2px solid rgba(251, 191, 36, 0.3)' : (isDark ? '1px solid #333' : '1px solid #e5e5e5')
              }}>
                <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: isDark ? '#666' : '#999', marginBottom: '8px' }}>
                  Subscription Status
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, marginBottom: '16px', color: isPremium ? '#fbbf24' : (isDark ? '#ffffff' : '#000000') }}>
                  {isPremium ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px' }}>⭐</span> Premium Member
                    </span>
                  ) : (
                    'Free Tier'
                  )}
                </div>
                
                {isPremium ? (
                  <button
                    onClick={async () => {
                      if (!user?.id) return;
                      try {
                        const response = await fetch('/api/stripe/portal', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: user.id })
                        });
                        const data = await response.json();
                        if (data.url) window.location.href = data.url;
                        else alert(`Error: ${data.error || 'Failed to open portal.'}`);
                      } catch (error) {
                        console.error('Failed to open portal:', error);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '8px',
                      background: isDark ? '#333' : '#e5e5e5',
                      color: isDark ? '#ffffff' : '#000000',
                      fontWeight: 900,
                      border: 'none',
                      cursor: 'pointer',
                      minHeight: '44px'
                    }}
                  >
                    Manage Subscription
                  </button>
                ) : (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('showPremium'))}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                      color: '#000000',
                      fontWeight: 900,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ⭐ UPGRADE TO PREMIUM
                  </button>
                )}
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Appearance */}
          <div style={{
            padding: '32px',
            borderRadius: '16px',
            background: isDark ? '#1a1a1a' : '#f9f9f9',
            border: isDark ? '1px solid #333' : '1px solid #e5e5e5'
          }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '24px' }}>
              Appearance
            </h2>

            <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: isDark ? '#666' : '#999', marginBottom: '12px' }}>
              Theme
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px' }}>
              {(['light', 'dark', 'system'] as Theme[]).map((theme) => (
                <button
                  key={theme}
                  onClick={() => {
                    updateTheme(theme);
                    setShowSuccessMessage(true);
                    setTimeout(() => setShowSuccessMessage(false), 2000);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: settings.theme === theme ? '#1a73e8' : (isDark ? '#0a0a0a' : '#ffffff'),
                    color: settings.theme === theme ? '#ffffff' : (isDark ? '#ffffff' : '#000000'),
                    fontWeight: 900,
                    border: settings.theme === theme ? 'none' : (isDark ? '2px solid #333' : '2px solid #e5e5e5'),
                    cursor: 'pointer',
                    textAlign: 'center',
                    minHeight: '44px',
                    textTransform: 'capitalize'
                  }}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          {/* Study Guide */}
          <div style={{
            padding: '32px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(26, 115, 232, 0.1), rgba(26, 115, 232, 0.05))',
            border: '2px solid rgba(26, 115, 232, 0.3)'
          }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '24px' }}>
              How to Study with StudyMaxx
            </h2>

            <div style={{ display: 'grid', gap: '16px' }}>
              {[
                { num: 1, title: 'Create Your Flashcards', desc: 'Paste your notes or upload a document. StudyMaxx will automatically generate smart flashcards.' },
                { num: 2, title: 'Study Mode - Learn the Cards', desc: 'Go through each flashcard. Read the question, think of the answer, then flip to check.' },
                { num: 3, title: 'Quiz Mode - Test Yourself', desc: 'Take the quiz to see how well you know the material. Choose from multiple choice options and track your score.' },
                { num: 4, title: 'Repeat Until Mastery', desc: 'Focus on cards you got wrong. Study them again and retake the quiz until you can answer everything correctly.' }
              ].map((step) => (
                <div key={step.num} style={{ display: 'flex', gap: '16px', padding: '20px', borderRadius: '12px', background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#1a73e8',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '20px',
                    flexShrink: 0
                  }}>
                    {step.num}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 900, marginBottom: '4px', fontSize: '16px' }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: isDark ? '#a0a0a0' : '#666666', lineHeight: '1.5' }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Study Facts */}
          <div style={{
            padding: '32px',
            borderRadius: '16px',
            background: isDark ? '#1a1a1a' : '#f9f9f9',
            border: isDark ? '1px solid #333' : '1px solid #e5e5e5'
          }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '16px' }}>
              How StudyMaxx Works
            </h2>

            <p style={{ fontSize: '16px', color: isDark ? '#a0a0a0' : '#666666', marginBottom: '24px', lineHeight: '1.6' }}>
              StudyMaxx is built on proven learning science principles that help you remember more in less time.
            </p>

            <div style={{ display: 'grid', gap: '12px' }}>
              {studyFacts.map((fact) => (
                <div
                  key={fact.id}
                  style={{ padding: '20px', borderRadius: '12px', background: isDark ? '#0a0a0a' : '#ffffff' }}
                >
                  <p style={{ fontSize: '15px', marginBottom: '8px', lineHeight: '1.5' }}>
                    {fact.text[settings.language] || fact.text['en']}
                  </p>
                  <p style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: isDark ? '#666' : '#999' }}>
                    Source: {fact.source[settings.language] || fact.source['en']}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Us */}
          <div style={{
            padding: '32px',
            borderRadius: '16px',
            background: isDark ? '#1a1a1a' : '#f9f9f9',
            border: isDark ? '1px solid #333' : '1px solid #e5e5e5'
          }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '24px' }}>
              Contact Us
            </h2>

            <div style={{ padding: '20px', borderRadius: '12px', background: isDark ? '#0a0a0a' : '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: isDark ? '#666' : '#999', marginBottom: '8px' }}>
                Email
              </div>
              <a 
                href="mailto:studymaxxer@gmail.com"
                style={{ fontSize: '16px', fontWeight: 700, color: '#1a73e8', textDecoration: 'none' }}
              >
                studymaxxer@gmail.com
              </a>
            </div>
          </div>

          {/* Feedback & Affiliate Program */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            {/* Send Feedback */}
            <div style={{
              padding: '32px',
              borderRadius: '16px',
              background: isDark ? '#1a1a1a' : '#f9f9f9',
              border: isDark ? '1px solid #333' : '1px solid #e5e5e5'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '24px' }}>
                Send Feedback
              </h2>

              {feedbackSent ? (
                <div style={{ 
                  padding: '20px', 
                  borderRadius: '12px', 
                  background: 'rgba(34, 197, 94, 0.1)', 
                  border: '2px solid #22c55e',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>
                    ✓ Thank you!
                  </p>
                  <p style={{ fontSize: '14px', color: isDark ? '#a0a0a0' : '#666666' }}>
                    Your feedback has been received.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: isDark ? '#666' : '#999', marginBottom: '8px' }}>
                      Type
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(['bug', 'feature', 'other'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setFeedbackType(type)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '8px',
                            background: feedbackType === type ? '#1a73e8' : (isDark ? '#0a0a0a' : '#ffffff'),
                            color: feedbackType === type ? '#ffffff' : (isDark ? '#ffffff' : '#000000'),
                            border: feedbackType === type ? 'none' : (isDark ? '1px solid #333' : '1px solid #e5e5e5'),
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us what you think..."
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '16px',
                      borderRadius: '12px',
                      background: isDark ? '#0a0a0a' : '#ffffff',
                      color: isDark ? '#ffffff' : '#000000',
                      border: isDark ? '1px solid #333' : '1px solid #e5e5e5',
                      fontSize: '15px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      marginBottom: '16px'
                    }}
                  />

                  <button
                    onClick={handleSendFeedback}
                    disabled={!feedbackText.trim() || isSendingFeedback}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '8px',
                      background: (!feedbackText.trim() || isSendingFeedback) ? (isDark ? '#333' : '#e5e5e5') : '#1a73e8',
                      color: (!feedbackText.trim() || isSendingFeedback) ? (isDark ? '#666' : '#999') : '#ffffff',
                      fontWeight: 900,
                      border: 'none',
                      cursor: (!feedbackText.trim() || isSendingFeedback) ? 'not-allowed' : 'pointer',
                      minHeight: '44px'
                    }}
                  >
                    {isSendingFeedback ? 'Sending...' : 'Send Feedback'}
                  </button>
                </>
              )}
            </div>

            {/* Affiliate Program */}
            <div style={{
              padding: '32px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(217, 70, 239, 0.1))',
              border: '2px solid rgba(139, 92, 246, 0.3)'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '16px' }}>
                💼 Become an Affiliate
              </h2>

              <p style={{ fontSize: '14px', color: isDark ? '#a0a0a0' : '#666666', marginBottom: '16px', lineHeight: '1.6' }}>
                Help us grow on TikTok and earn money! Get your unique referral code and earn:
              </p>

              <div style={{ padding: '16px', borderRadius: '8px', background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#8b5cf6', marginBottom: '4px' }}>
                  Your Customers Get
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: isDark ? '#ffffff' : '#000000' }}>
                  15% off first month
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: '8px', background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#8b5cf6', marginBottom: '4px' }}>
                  You Earn
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: isDark ? '#ffffff' : '#000000' }}>
                  20% recurring commission
                </div>
                <div style={{ fontSize: '12px', color: isDark ? '#666' : '#999', marginTop: '4px' }}>
                  Every month they stay subscribed
                </div>
              </div>

              <a
                href="/affiliate"
                style={{
                  display: 'flex',
                  width: '100%',
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                  color: '#ffffff',
                  fontWeight: 900,
                  textAlign: 'center',
                  textDecoration: 'none',
                  minHeight: '44px',
                  lineHeight: '1.2',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Apply Now
              </a>
            </div>
          </div>

          {/* About */}
          <div style={{
            padding: '32px',
            borderRadius: '16px',
            background: isDark ? '#1a1a1a' : '#f9f9f9',
            border: isDark ? '1px solid #333' : '1px solid #e5e5e5'
          }}>
            <h2 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '24px' }}>
              About
            </h2>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderRadius: '8px', background: isDark ? '#0a0a0a' : '#ffffff' }}>
                <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: isDark ? '#666' : '#999' }}>Version</span>
                <span style={{ fontWeight: 900 }}>2.0.0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderRadius: '8px', background: isDark ? '#0a0a0a' : '#ffffff' }}>
                <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: isDark ? '#666' : '#999' }}>Storage</span>
                <span style={{ fontWeight: 900 }}>Browser</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '64px' }} />
      </div>
    </div>
  );
}

