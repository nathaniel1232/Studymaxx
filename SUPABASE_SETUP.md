# Supabase Authentication Setup

## Quick Start

The app works without Supabase - users can still create and save flashcards locally. Authentication is optional but recommended for syncing across devices.

## Setting up Supabase (Optional)

1. **Create a Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose organization and name your project

2. **Get your API keys**
   - In your project dashboard, go to Settings > API
   - Copy the "Project URL" and "anon/public" key

3. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. **Enable Email Auth (for magic links)**
   - Go to Authentication > Providers
   - Enable "Email" provider
   - Configure email templates if desired

5. **Enable Google OAuth (optional)**
   - Go to Authentication > Providers
   - Enable "Google" provider
   - Add your Google OAuth credentials
   - Set redirect URL to: `http://localhost:3000/auth/callback` (development)

6. **Create auth callback route**
   The callback route is already created at `/app/auth/callback` - it handles the OAuth redirect.

## Features

- **Magic Link Email Login** - Passwordless authentication via email
- **Google OAuth** - One-click sign in with Google
- **Automatic Data Migration** - When users log in, their anonymous flashcard sets are automatically linked to their account
- **Skip Login** - Users can always skip and continue using the app locally

## Data Structure

Flashcard sets have both `userId` (anonymous ID) and `accountId` (logged-in user ID) fields:
- Anonymous users: Only `userId` is set
- Logged-in users: Both `userId` and `accountId` are set
- Migration happens automatically via `migrateAnonymousSetsToAccount(accountId)`

## Testing Locally

Run the development server:
```bash
npm run dev
```

The login modal will appear after creating flashcards. You can:
- Test email magic link (requires Supabase setup)
- Test Google OAuth (requires Supabase + Google credentials)
- Click "Skip" to continue without logging in

## Production Deployment

When deploying to production:
1. Add environment variables to your hosting platform (Vercel, Netlify, etc.)
2. Update Google OAuth redirect URL to your production domain
3. Update email templates in Supabase to match your domain
4. Test the full authentication flow

## Troubleshooting

**"Authentication not configured" error:**
- Check that your `.env.local` file exists and has the correct keys
- Restart the development server after adding environment variables

**Magic link not arriving:**
- Check spam folder
- Verify email provider is enabled in Supabase
- Check Supabase logs for email delivery errors

**Google OAuth not working:**
- Verify Google OAuth credentials in Supabase
- Check that redirect URL matches exactly
- Ensure Google project has the app domain approved
