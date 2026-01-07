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
 * Sign in with magic link
 */
export const signInWithMagicLink = async (email: string) => {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  if (error) throw error;
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
