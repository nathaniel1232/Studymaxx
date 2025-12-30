# 📦 Complete PowerShell Installation Guide for Stripe CLI

## 🎯 Goal
Install Stripe CLI on Windows using PowerShell so you can test Premium payments locally.

**Time needed:** 5-10 minutes  
**Prerequisites:** Windows 10 or 11

---

## 🚀 Step-by-Step Installation

### Step 1: Open PowerShell as Administrator

**Why Administrator?** The installation needs permission to add programs to your system.

1. **Press** `Windows Key` (the Windows logo key on your keyboard)
2. **Type** `powershell`
3. **Right-click** on "Windows PowerShell"
4. **Click** "Run as administrator"
5. **Click** "Yes" if Windows asks for permission

You should see a blue window that says something like:
```
Windows PowerShell
Copyright (C) Microsoft Corporation. All rights reserved.

PS C:\Windows\system32>
```

The `PS C:\Windows\system32>` is your prompt. This means you're running as admin.

---

### Step 2: Install Stripe CLI Using Winget

**Copy this command exactly:**

```powershell
winget install stripe.stripe-cli
```

**Paste it into PowerShell:**
- Right-click in the PowerShell window to paste
- OR press `Ctrl+V`
- Press `Enter`

**What you'll see:**

```
Found Stripe CLI [stripe.stripe-cli] Version 1.21.8
This application is licensed to you by its owner.
Microsoft is not responsible for, nor does it grant any licenses to, third-party packages.
Downloading https://github.com/stripe/stripe-cli/releases/download/v1.21.8/stripe_1.21.8_windows_x86_64.zip
  ██████████████████████████████  5.12 MB / 5.12 MB
Successfully verified installer hash
Extracting archive...
Successfully extracted archive
Starting package install...
Successfully installed
```

**If you see an error about "winget not found":**
- You might be on older Windows. See "Alternative Installation" below.

---

### Step 3: Verify Installation

**Close and reopen PowerShell** (this time, normal PowerShell is fine - no admin needed):

1. Press `Windows Key`
2. Type `powershell`
3. Click "Windows PowerShell" (NOT as admin this time)

**Type this command:**

```powershell
stripe --version
```

**You should see:**

```
stripe version 1.21.8
```

✅ **SUCCESS!** Stripe CLI is installed correctly.

---

### Step 4: Check Where It's Installed

**Type this command:**

```powershell
Get-Command stripe | Select-Object Source
```

**You should see something like:**

```
Source
------
C:\Users\YourName\AppData\Local\Microsoft\WinGet\Packages\stripe.stripe-cli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe
```

This is the correct location! Winget installs it in your user directory, which is perfect.

---

## 🔐 Step 5: Login to Stripe

**In the same PowerShell window, type:**

```powershell
stripe login
```

**What happens:**

1. You'll see:
   ```
   Your pairing code is: XXXX-XXXX
   This pairing code verifies your authentication with Stripe.
   Press Enter to open the browser (^C to quit)
   ```

2. **Press Enter**

3. Your browser will open to: `https://dashboard.stripe.com/stripecli/confirm_auth?t=...`

4. **You'll see a page that says:**
   - "Authorize access to your Stripe account?"
   - The pairing code shown in terminal

5. **Click the green "Allow access" button**

6. **Back in PowerShell, you'll see:**
   ```
   > Done! The Stripe CLI is configured for [Your Stripe Account] with account id acct_xxxxxxxxxxxxx
   
   Please note: this key will expire after 90 days, after which you will need to re-authenticate.
   ```

✅ **SUCCESS!** You're logged into Stripe CLI.

---

## 🎯 Step 6: Forward Webhooks (THE IMPORTANT PART)

**Keep your dev server running!** In a different terminal/PowerShell window, you should have `npm run dev` running.

**In this PowerShell window, type:**

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**You should see:**

```
> Ready! You are using Stripe API Version [2025-12-15.clover].
> Your webhook signing secret is whsec_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0
```

**⚠️ CRITICAL: Copy that secret!**

The secret looks like: `whsec_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0`

**How to copy from PowerShell:**
1. Use your mouse to **highlight the secret** (starting from `whsec_`)
2. **Press Enter** (in PowerShell, Enter copies selected text)
3. OR right-click the selected text

---

## 📝 Step 7: Update .env.local

1. **Keep the PowerShell window open** (the one with `stripe listen` running)

2. **In VS Code, open:** `.env.local`

3. **Find this line:**
   ```
   STRIPE_WEBHOOK_SECRET=whsec_development_testing_only
   ```

4. **Replace it with your real secret:**
   ```
   STRIPE_WEBHOOK_SECRET=whsec_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0
   ```
   *(Use YOUR secret from Step 6)*

5. **Save the file** (`Ctrl+S`)

---

## 🔄 Step 8: Restart Your Dev Server

1. **Go to the terminal running `npm run dev`**

2. **Press `Ctrl+C`** to stop it

3. **Run again:**
   ```bash
   npm run dev
   ```

4. **Wait for:**
   ```
   ▲ Next.js 16.0.10
   - Local: http://localhost:3000
   ✓ Ready in 2.3s
   ```

---

## ✅ FINAL SETUP CHECKLIST

Before testing, make sure:

**Terminal/PowerShell Windows:**
- [ ] Terminal 1: Running `npm run dev` 
- [ ] Terminal 2: Running `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  - Shows "Ready!" message
  - Shows webhook signing secret

**Configuration:**
- [ ] `.env.local` updated with real webhook secret (starts with `whsec_`)
- [ ] Dev server restarted after updating `.env.local`

**Visual check - Your screen should have:**
```
┌─────────────────────┬─────────────────────┐
│   VS Code Editor    │   Browser           │
│   (.env.local open) │   (localhost:3000)  │
├─────────────────────┼─────────────────────┤
│   Terminal 1        │   Terminal 2        │
│   npm run dev       │   stripe listen     │
└─────────────────────┴─────────────────────┘
```

---

## 🧪 Test It's Working

1. **Go to your app:** `http://localhost:3000`

2. **Sign in** (or create account)

3. **Click your profile → "Upgrade to Premium"**

4. **Enter test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`

5. **Click Subscribe**

6. **Watch Terminal 2 (Stripe CLI):**
   ```
   2025-12-29 14:23:45  --> checkout.session.completed [evt_xxxxx]
   2025-12-29 14:23:45  <-- [200] POST http://localhost:3000/api/stripe/webhook
   ```
   ✅ The `[200]` means success!

7. **Watch Terminal 1 (Dev Server):**
   ```
   ✅ Checkout completed for user: abc123...
   ✅ User abc123... is now Premium
   ```

8. **In your browser:**
   - **Press F5** to refresh
   - You should see **⭐ Premium** badge!

---

## 🐛 Common Issues & Solutions

### Issue: "winget: The term 'winget' is not recognized"

**You're on older Windows or winget isn't installed.**

**Solution - Use Direct Download:**

1. **Go to:** https://github.com/stripe/stripe-cli/releases/latest
2. **Download:** `stripe_X.XX.X_windows_x86_64.zip`
3. **Extract to:** `C:\stripe\` (create this folder)
4. **Add to PATH:**
   ```powershell
   # Run as Administrator
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\stripe", "User")
   ```
5. **Close and reopen PowerShell**
6. **Test:** `stripe --version`

### Issue: "stripe: The term 'stripe' is not recognized" (after installation)

**Solution:**
1. **Close ALL PowerShell windows**
2. **Open a NEW PowerShell**
3. **Try:** `stripe --version`

### Issue: "Access denied" when installing

**Solution:**
- Make sure you opened PowerShell **as Administrator** (Step 1)

### Issue: Stripe CLI shows "Ready!" but webhooks still fail

**Check these:**

1. **Is the secret correct in .env.local?**
   - Open `.env.local`
   - Compare with the secret in Terminal 2
   - No extra spaces, no quotes

2. **Did you restart dev server after updating .env.local?**
   - Press `Ctrl+C` in Terminal 1
   - Run `npm run dev` again

3. **Are both terminals running?**
   - Terminal 1: Shows "Ready in X.Xs"
   - Terminal 2: Shows "Ready! You are using Stripe API..."

---

## 📂 File Locations Reference

**Stripe CLI installed at:**
```
C:\Users\YourUsername\AppData\Local\Microsoft\WinGet\Packages\stripe.stripe-cli_...\stripe.exe
```

**Your project's .env.local:**
```
C:\Users\natha\OneDrive\Skrivebord\studymaxx\.env.local
```

**Stripe CLI config (after login):**
```
C:\Users\YourUsername\.config\stripe\config.toml
```

---

## 🎉 Success Indicators

You know it's working when:

1. ✅ `stripe --version` shows version number
2. ✅ `stripe login` succeeds without errors
3. ✅ `stripe listen` shows "Ready!" and webhook secret
4. ✅ Test payment triggers webhook in Terminal 2
5. ✅ Dev server logs show "User is now Premium"
6. ✅ Browser shows Premium badge after refresh

---

## 🔄 Daily Workflow

**Every time you want to test payments:**

1. **Terminal 1:** `npm run dev`
2. **Terminal 2:** `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Test payments with `4242 4242 4242 4242`

**You only need to:**
- Install Stripe CLI **once**
- Login to Stripe **once every 90 days**
- Update `.env.local` webhook secret **once** (unless it changes)

But you need to run `stripe listen` **every time** you're developing and want to test payments.

---

## 💡 Pro Tips

1. **Keep Stripe CLI running** while developing Premium features
2. **Use VS Code integrated terminal** - easier to manage multiple terminals
3. **Bookmark Stripe Dashboard** - useful for checking payments: https://dashboard.stripe.com/test/payments
4. **Set an alias** for the listen command:
   ```powershell
   # Add to PowerShell profile
   function Start-StripeWebhook { stripe listen --forward-to localhost:3000/api/stripe/webhook }
   Set-Alias webhook Start-StripeWebhook
   
   # Now just type: webhook
   ```

---

## ✨ You're Done!

You now have:
- ✅ Stripe CLI installed in the correct location
- ✅ Logged into your Stripe account  
- ✅ Webhooks forwarding to your local dev server
- ✅ `.env.local` configured correctly
- ✅ Everything ready to test Premium payments!

**Next step:** Make a test payment and watch Premium activate instantly! 🚀
