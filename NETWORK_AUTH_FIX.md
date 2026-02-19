v# Fix Login on Network Host (Local Network)

When accessing the app from another device on your network (e.g., `http://192.168.1.100:3000`), login fails because Supabase needs to allow that URL.

## Quick Fix (2 steps)

### 1. Find your network IP
Run this in PowerShell to get your computer's IP address:
```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like '*Ethernet*' -or $_.InterfaceAlias -like '*Wi-Fi*'} | Select-Object -First 1).IPAddress
```

Example output: `192.168.1.100`

### 2. Add to Supabase Dashboard

1. Go to **Supabase Dashboard** → Your Project → **Authentication** → **URL Configuration**
2. Add these URLs to **Redirect URLs**:
   - `http://YOUR_IP:3000/auth/callback` (example: `http://192.168.1.100:3000/auth/callback`)
   - `http://YOUR_IP:3000/*` (example: `http://192.168.1.100:3000/*`)

3. Add to **Site URL**:
   - `http://YOUR_IP:3000` (example: `http://192.168.1.100:3000`)

4. Click **Save**

### 3. Restart dev server
```powershell
npm run dev
```

Now you should be able to log in from other devices! 🎉

## For Production (Vercel/Deployment)

If you deploy to Vercel or another host, add:
- `https://your-domain.com/auth/callback`
- `https://your-domain.com/*`

to the same Redirect URLs section.

---

## 🔴 CRITICAL: Google OAuth Setup (Required!)

**Google Sign-In will NOT work** until you add the network URL to Google Cloud Console:

### Step-by-step:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (same one used for Supabase Google OAuth)
3. Navigate to **APIs & Services** → **Credentials**
4. Find your **OAuth 2.0 Client ID** (the one configured in Supabase)
5. Click **Edit** (pencil icon)

6. Under **Authorized JavaScript origins**, click **+ ADD URI** and add:
   ```
   http://192.168.50.238:3000
   ```

7. Under **Authorized redirect URIs**, click **+ ADD URI** and add:
   ```
   http://192.168.50.238:3000/auth/callback
   ```
   
   **Also add the Supabase OAuth redirect** (if not already there):
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```

8. Click **Save** at the bottom

9. Wait 1-2 minutes for changes to propagate

### Test it:
- Restart dev server: `npm run dev`
- Try Google Sign-In again

### Common error messages:
- ❌ `redirect_uri_mismatch` → You forgot to add the URL to Google Console
- ❌ `Error 400: invalid_request` → Check that the redirect URI exactly matches (with `/auth/callback`)
- ❌ Stuck on loading → Check browser console for CORS or redirect errors
