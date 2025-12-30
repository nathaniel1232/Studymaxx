"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "../utils/supabase";
import { useTranslation } from "../contexts/SettingsContext";

interface UserProfileDropdownProps {
  user: any;
  isPremium?: boolean;
  onNavigateSettings?: () => void;
  onUpgradePremium?: () => void;
}

export default function UserProfileDropdown({ user, isPremium, onNavigateSettings, onUpgradePremium }: UserProfileDropdownProps) {
  const t = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const getDisplayName = () => {
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef} style={{ zIndex: 1001 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-xl transition-all hover:scale-105 hover:shadow-lg"
        style={{ 
          background: 'var(--surface)', 
          border: '2px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Avatar */}
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)' }}
        >
          {getInitials()}
        </div>
        
        {/* User info */}
        <div className="flex items-center gap-2">
          <div className="text-left">
            <div className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
              {getDisplayName()}
            </div>
            {isPremium && (
              <div className="text-xs font-bold" style={{ color: '#fbbf24' }}>
                ⭐ Premium
              </div>
            )}
          </div>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            style={{ color: 'var(--foreground-muted)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2"
          style={{ 
            background: 'var(--surface-elevated)', 
            border: '2px solid var(--border)',
            zIndex: 1002,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            position: 'absolute'
          }}
        >
          {/* User info section */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)' }}
              >
                {getInitials()}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
                  {getDisplayName()}
                </div>
                <div className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  {user.email}
                </div>
              </div>
            </div>
            {isPremium && (
              <div 
                className="px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-md"
                style={{ 
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
                  color: '#000',
                  boxShadow: '0 2px 8px rgba(251, 191, 36, 0.4)'
                }}
              >
                <span>⭐</span>
                <span>Premium Member</span>
              </div>
            )}
          </div>

          {/* Menu items */}
          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onNavigateSettings) {
                  onNavigateSettings();
                }
              }}
              className="w-full px-4 py-3 rounded-xl text-left text-sm font-medium flex items-center gap-3 transition-colors"
              style={{ color: 'var(--foreground)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{t("account") || "Account"}</span>
            </button>

            {!isPremium && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onUpgradePremium) {
                    onUpgradePremium();
                  }
                }}
                className="w-full px-4 py-3 rounded-xl text-left text-sm font-bold flex items-center gap-3 transition-colors text-yellow-600 dark:text-yellow-400"
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>{t("upgrade_premium") || "Upgrade to Premium"}</span>
              </button>
            )}

            <div className="my-2 h-px" style={{ background: 'var(--border)' }}></div>

            <button
              onClick={handleSignOut}
              className="w-full px-4 py-3 rounded-xl text-left text-sm font-medium flex items-center gap-3 transition-colors text-red-600 dark:text-red-400"
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>{t("sign_out") || "Sign out"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
