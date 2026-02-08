import { createBrowserClient } from '@supabase/ssr';

// These should be in environment variables in production
// For now, they can be public as they're client-side only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Check if Supabase is configured
 */
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

/**
 * Validate email to prevent bounces (reusable logic)
 */
export const validateEmailForAuth = (email: string): { valid: boolean; error?: string } => {
    // 1. Basic format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: "Invalid email format" };
    }

    // 2. Block default/test domains that cause bounces
    const riskyDomains = [
        'test.com', 'example.com', 'email.com', 'sample.com', 
        'tempmail.com', 'mailinator.com', '10minutemail.com',
        'yopmail.com', 'testing.com', 'noreply.com'
    ];
    
    // 3. Block specific test patterns
    if (email.endsWith('.test') || email.endsWith('.example') || email.endsWith('.invalid')) {
        return { valid: false, error: "Test domains are not allowed" };
    }

    const domain = email.split('@')[1].toLowerCase();
    if (riskyDomains.includes(domain)) {
        return { valid: false, error: "Please use a real email provider" };
    }

    // 4. Block "test" user patterns that are obviously fake
    const params = email.split('@')[0].toLowerCase();
    if (params === 'test' || params === 'user' || params === 'admin' || params === 'example') {
         return { valid: false, error: "Generic test emails are not allowed" };
    }

    return { valid: true };
}

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  // Log current origin for debugging network host issues
  if (typeof window !== 'undefined') {
    console.log('[Auth] Sign in attempt from:', window.location.origin);
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('[Auth] Sign in error:', error.message);
    // Handle rate limit errors with friendly message
    if (error.message?.toLowerCase().includes('rate limit') || 
        error.message?.toLowerCase().includes('too many requests')) {
      throw new Error('Too many login attempts. Please try again in a few minutes or use Google Sign-In.');
    }
    throw error;
  }
  
  console.log('[Auth] Sign in successful');
  return data;
};

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  // Validate before hitting Supabase API to save bounce quota
  const validation = validateEmailForAuth(email);
  if (!validation.valid) {
      throw new Error(validation.error);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  if (error) {
    // Handle rate limit errors with friendly message
    if (error.message?.toLowerCase().includes('rate limit') || 
        error.message?.toLowerCase().includes('too many requests')) {
      throw new Error('Too many signup attempts. Please try again in a few minutes or use Google Sign-In.');
    }
    throw error;
  }
  return data;
};

/**
 * Sign in with Magic Link
 */
export const signInWithMagicLink = async (email: string) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Validate before hitting Supabase API
  const validation = validateEmailForAuth(email);
  if (!validation.valid) {
      throw new Error(validation.error);
  }
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  if (error) throw error;
  return data;
};



/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async () => {
  if (!supabase) throw new Error('Supabase not configured');
  
  // Always use current origin for redirect (works for both localhost and production)
  const redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/callback`
    : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://studymaxx.net'}/auth/callback`;
  
  console.log('[Auth] Google OAuth starting...');
  console.log('[Auth] Current origin:', typeof window !== 'undefined' ? window.location.origin : 'server');
  console.log('[Auth] Redirect URL:', redirectUrl);
  
  // Check if using network host
  if (typeof window !== 'undefined' && /^\d+\.\d+\.\d+\.\d+/.test(window.location.hostname)) {
    console.warn('[Auth] ⚠️ Network host detected! Make sure you added this URL to:');
    console.warn(`[Auth] 1. Supabase Dashboard → Auth → URL Configuration → Redirect URLs: ${redirectUrl}`);
    console.warn(`[Auth] 2. Google Cloud Console → OAuth Client → Authorized redirect URIs: ${redirectUrl}`);
    console.warn(`[Auth] 3. Google Cloud Console → OAuth Client → Authorized JavaScript origins: ${window.location.origin}`);
  }
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });
  
  if (error) {
    console.error('[Auth] Google OAuth error:', error);
    if (error.message?.includes('redirect') || error.message?.includes('origin')) {
      throw new Error(`Google OAuth configuration error. If on network host, add ${redirectUrl} to Google Cloud Console. See NETWORK_AUTH_FIX.md`);
    }
    throw error;
  }
  
  console.log('[Auth] Google OAuth redirect initiated');
};

/**
 * Sign out
 */
export const signOut = async () => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Reset password - sends reset email
 */
export const resetPassword = async (email: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?type=recovery`,
  });
  if (error) throw error;
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  if (!supabase) return null;
  
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (user: any) => void) => {
  if (!supabase) return () => {};
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
    callback(session?.user ?? null);
  });
  
  return () => subscription.unsubscribe();
};
