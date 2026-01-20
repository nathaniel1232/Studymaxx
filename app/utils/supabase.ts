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
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
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
  
  if (error) throw error;
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
  
  console.log('[Auth] Google OAuth redirect URL:', redirectUrl);
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });
  
  if (error) throw error;
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
