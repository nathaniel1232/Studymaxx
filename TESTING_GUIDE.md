# 🧪 Testing Guide for StudyMaxx Fixes

## Quick Start Testing

### 1. Start the Development Server
```bash
npm run dev
```
Then open http://localhost:3000

---

## 🌍 PART 1: Language System Testing

### Test Norwegian Translation
1. Click **Settings** (⚙️) in top-right
2. Change **Language** from English to Norwegian
3. Go back to home
4. Click **"Lag ny"** (Create new)
5. **Verify**: All text is in Norwegian (no English mixed in)

### Test All Screens in Norwegian:
- Home page buttons and text
- Create flow (subject, material, grade)
- Study mode (flashcard buttons, navigation)
- Test mode (quiz questions, feedback)
- Settings screen

### Expected Result:
✅ Zero English text when Norwegian is selected
✅ All buttons, labels, and messages in Norwegian
✅ Facts and sources translated

---

## 📊 PART 2: Flashcard Grading Testing

### Test Bad/OK/Good Ratings
1. Create a new flashcard set (or use existing)
2. Click **Study** mode
3. For each card, click one of:
   - **❌ Bad** → Card should turn RED
   - **😐 OK** → Card should turn YELLOW
   - **✅ Good** → Card should turn GREEN

### Test Rating Persistence
1. Rate a card as "Bad"
2. Go to previous card
3. Come back to the same card
4. **Verify**: Rating badge still shows "❌ Dårlig" (or "❌ Bad")

### Test Summary Screen
1. Rate all cards in a set
2. After the last card, summary should appear
3. **Verify**:
   - Red box shows weak card count
   - Yellow box shows medium card count
   - Green box shows mastered card count
   - Buttons: "Review weak cards first" and "Continue to test"

### Expected Result:
✅ Ratings are stored and visible
✅ Cards change color based on rating
✅ Summary shows accurate counts
✅ "Got it" button is GONE (removed)

---

## 🎯 PART 3: Test Flow Testing

### Test Shuffle Lock
1. Create flashcards
2. Click **Study** mode
3. Click **Shuffle** → should work (cards reorder)
4. Click **Test Yourself**
5. Try clicking **Shuffle** → should be DISABLED (grayed out)
6. In Norwegian: Should show "Blanding deaktivert under test"

### Test Quiz Completion
1. Start a test
2. Answer all questions (mix of correct and incorrect)
3. **Verify**:
   - Auto-advances after each answer (1.5s delay)
   - Wrong answers don't freeze the test
   - Green checkmark for correct
   - Red X for incorrect
   - Correct answer shown when wrong

### Test Results Screen
1. Complete a test
2. **Verify**:
   - Shows final score (X / Y correct)
   - Shows best streak (if > 1)
   - Offers "Retake test" button
   - Offers "Study mode" button
3. Click "Retake test"
4. **Verify**: Test resets to question 1 with fresh state

### Expected Result:
✅ Shuffle disabled during test
✅ No soft-locks or freezes
✅ Clear feedback on every answer
✅ Results screen shows accurate data
✅ Retake works properly

---

## 🎨 PART 4: Visual Feedback Testing

### Test Button Colors
1. Go to Study mode
2. Hover over Bad/OK/Good buttons
3. **Verify**:
   - Bad button: RED border, red text
   - OK button: YELLOW border, yellow text
   - Good button: GREEN border, green text
4. Click each button
5. **Verify**: Selected button has solid color background + ring glow

### Test Flashcard Colors
1. Rate a card as "Bad"
2. **Verify**: Flashcard has RED gradient
3. Rate a card as "OK"
4. **Verify**: Flashcard has YELLOW gradient
5. Rate a card as "Good"
6. **Verify**: Flashcard has GREEN gradient
7. Unrated cards should be BLUE

### Test Emojis
1. In Test mode, answer correctly
2. **Verify**: See ✅ or 🎉 emoji
3. Answer incorrectly
4. **Verify**: See 😬 emoji
5. Build a streak of 3+
6. **Verify**: See 🔥 emoji and animation

### Test Dark Mode
1. Go to Settings
2. Change Theme to "Dark"
3. **Verify**: All colors still visible and appropriate
4. Red/yellow/green should be brighter shades in dark mode

### Expected Result:
✅ Buttons are color-coded (red/yellow/green)
✅ Flashcards change color based on rating
✅ Emojis appear in feedback messages
✅ Streak counter always visible
✅ Colors work in both light and dark mode

---

## 🧹 PART 5: UI Cleanup Testing

### Test Clean Layout
1. Go to Study mode
2. **Verify**:
   - Focus is on the flashcard (center of screen)
   - Stats boxes are compact (3 boxes: Progress, Good, Weak)
   - No unnecessary boxes or clutter
   - Buttons look like buttons (not plain text)

### Test Button Design
1. Check all buttons in the app
2. **Verify**:
   - All have borders or background color
   - All have hover effects
   - All have clear labels
   - None look like plain text links

### Expected Result:
✅ Clean, focused layout
✅ No useless information boxes
✅ Buttons are obvious and clickable
✅ Attention drawn to flashcard

---

## 🔐 PART 6: Auth Prep Testing

### Test Profile Entry Point
1. Go to home page
2. Click **👤 Profile** button (top-left)
3. **Verify**: Alert says "Profile coming soon!"

### Test Login Modal
1. Create flashcards
2. Save the set (💾 Save button)
3. **Verify**: Login modal appears after saving
4. Check modal has:
   - Email input field
   - "Send magic link" button
   - Google sign-in button
   - "Skip for now" button

### Test Google Auth Button
1. Open Login modal
2. **Verify**: Google button shows Google logo
3. In Norwegian: Button says "Fortsett med Google"

### Test Skip
1. Click "Skip for now" in login modal
2. **Verify**: Modal closes, app continues working

### Expected Result:
✅ Profile button exists (even if not fully functional)
✅ Login modal appears when appropriate
✅ Email and Google auth are ready
✅ Users can skip login
✅ No forced authentication

---

## 🐛 Edge Cases to Test

### Test Empty States
- [ ] What happens with 0 flashcards?
- [ ] What happens if you skip all ratings?

### Test Rapid Clicking
- [ ] Click rating buttons rapidly
- [ ] Click Next/Previous rapidly in Study mode
- [ ] Click answer options rapidly in Test mode

### Test Language Mid-Session
- [ ] Start in English
- [ ] Switch to Norwegian mid-test
- [ ] Verify no crashes or mixed language

---

## ✅ Success Criteria

After all tests pass:
- ✅ No English text when Norwegian selected
- ✅ Ratings actually work and persist
- ✅ Tests complete without soft-locks
- ✅ Colors and emojis enhance experience
- ✅ UI is clean and focused
- ✅ Auth is ready (even if optional)

---

## 📸 Screenshots to Take

For documentation:
1. Norwegian language home page
2. Study mode with color-coded ratings
3. Summary screen showing weak/medium/mastered
4. Test mode with streak counter
5. Dark mode with proper colors
6. Login modal with Google auth

---

## 🚀 Performance Checks

### Quick Load Test
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. **Verify**: Page loads in < 2 seconds

### Animation Smoothness
1. Watch card flip animations
2. Watch button hover effects
3. **Verify**: No jank or lag (60fps)

---

## 📝 Report Issues

If you find any bugs:
1. Note the exact steps to reproduce
2. Take a screenshot
3. Check browser console for errors (F12)
4. Test in both English and Norwegian
5. Test in both light and dark mode

---

## 🎉 You're Done!

If all tests pass, the app is ready for use. Enjoy learning with StudyMaxx! 🚀
