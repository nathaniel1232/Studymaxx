# Quick Reference: Using the Messages System

## Overview
The centralized messaging system (`app/utils/messages.ts`) provides consistent, warm, human-friendly copy throughout the app.

## Quick Start

### 1. Import the Messages System
```tsx
import { messages } from "../utils/messages";
```

### 2. Use Messages in Your Component
```tsx
// Show a success message
showToast(messages.success.cardsSaved, "success");

// Show an error message
showToast(messages.errors.saveFailedAuth, "error");

// Set form error
setError(messages.errors.subjectRequired);

// Use button text
<button>{messages.buttons.create}</button>
```

## Message Categories

### Success Messages (`messages.success`)
```typescript
cardsSaved        // "✨ All set! Your flashcards are ready to study."
setCreated        // "🎉 Study set created! Ready to learn?"
textExtracted     // "📖 Text extracted successfully. Let's create flashcards!"
premiumActivated  // "🎉 Welcome to Premium! All features are now unlocked."
dataSynced        // "✅ Your study sets are synced across all devices."
transcriptExtracted // "✅ Transcript extracted! Ready to create flashcards."
```

### Error Messages (`messages.errors`)

#### Generic/System
```typescript
systemError          // "Something went wrong. Please try again..."
networkError         // "Connection lost. Please check your internet..."
tryAgain             // "Let's try that again."
```

#### Saving
```typescript
saveFailedAuth       // "Please sign in to save your study set."
saveFailedGeneric    // "Couldn't save your study set. Please try again."
saveFailedNetwork    // "Connection issue while saving. Your work is still in the app."
```

#### Generation
```typescript
generationFailed     // "Couldn't generate flashcards..."
generationTimeout    // "This is taking longer than expected..."
textTooShort         // "Please provide at least 100 characters of text."
notEnoughContent     // "Please add more content. We need at least 20 characters..."
```

#### Upload/File Processing
```typescript
imageProcessingFailed    // "Couldn't read the image text. Try a clearer image..."
pdfProcessingFailed      // "Couldn't read the PDF. The file might be corrupted..."
youtubeProcessingFailed  // "Couldn't get the video transcript. Please try another video."
uploadFailed             // "File upload failed. Please try a different file."
fileTooLarge             // "File is too large. Try a smaller file."
```

#### File Validation
```typescript
invalidFileType      // "Please upload an image, PDF, or document file."
tooManyImages        // "That's more images than allowed. Please select fewer files."
premiumMultiImage    // "Free users can upload 1 image at a time..."
noImages             // "No images selected. Please choose at least one."
```

#### Connection/Auth
```typescript
connectionError      // "Connection issue. Please refresh the page and try again."
signInRequired       // "Please sign in to upload files."
```

#### Step Validation
```typescript
subjectRequired      // "What subject are you studying?"
materialTypeRequired // "Choose a way to add your content."
notesRequired        // "Add some notes to create flashcards."
youtubeUrlRequired   // "Paste a YouTube link to extract the transcript."
fileRequired         // "Upload a file to extract text from."
gradeRequired        // "Choose your target grade level."
```

#### Content Validation
```typescript
noContent            // "Add some content to create flashcards."
```

#### YouTube Specific
```typescript
youtubeExtraction    // "Couldn't extract the transcript. Try a different video."
youtubeNeedsCaptions // "This video doesn't have captions..."
```

### Loading Messages (`messages.loading`)
```typescript
generatingCards      // "Creating your flashcards... This usually takes about 60 seconds."
extractingText       // "Reading your image... Just a moment."
processingMultiple   // "Processing your images... Almost there."
syncing              // "Saving your work..."
loading              // "Loading..."
```

### Button Text (`messages.buttons`)
```typescript
create       // "Create Flashcards"
save         // "Save Study Set"
continue     // "Continue"
tryAgain     // "Try Again"
goBack       // "Go Back"
close        // "Close"
dismiss      // "Dismiss"
upgrade      // "Upgrade to Premium"
signIn       // "Sign In"
skipForNow   // "Skip for now"
```

### Modal Content (`messages.modals`)
```typescript
login: {
  title       // "Keep Your Work Safe"
  description // "Sign in to save your study sets and sync across your devices."
}

premium: {
  title       // "Unlock Premium"
  description // "Get unlimited flashcards, PDF upload, YouTube, and more."
}

confirmDelete: {
  title       // "Delete Study Set?"
  description // "This can't be undone."
}

saving: {
  title       // "Saving Your Study Set"
  description // "Give your set a name so you can find it later."
}
```

### Empty States (`messages.empty`)
```typescript
noSets        // "No study sets yet. Create one to get started!"
noFlashcards  // "No flashcards. Add some content and generate them."
noHistory     // "No study history yet. Start studying to see your progress."
```

### Guidance Text (`messages.guidance`)
```typescript
startHere           // "👋 Start by choosing how you want to create flashcards."
bestResults         // "✨ Tip: More detailed notes create better flashcards."
unlimitedPremium    // "💡 Premium members get unlimited flashcards, PDF upload, YouTube, and more."
shareStudySets      // "🔗 You can share study sets with friends."
```

## Common Usage Patterns

### In Toast Notifications
```tsx
// Success
showToast(messages.success.cardsSaved, "success");

// Error
showToast(messages.errors.saveFailedAuth, "error");

// Warning
showToast(messages.errors.premiumMultiImage, "warning");

// Info
showToast(messages.info.freeLimitReached, "info");
```

### In Form Validation
```tsx
const handleSubmit = (e) => {
  e.preventDefault();
  
  if (!subject.trim()) {
    setError(messages.errors.subjectRequired);
    return;
  }
  
  if (!content.trim()) {
    setError(messages.errors.noContent);
    return;
  }
  
  setError(""); // Clear errors
  // Continue with submission...
};
```

### In Async Operations
```tsx
const handleSave = async () => {
  try {
    await saveFlashcardSet(name, cards);
    showToast(messages.success.setCreated, "success");
  } catch (error) {
    showToast(messages.errors.saveFailedGeneric, "error");
  }
};
```

### In Button Text
```tsx
<button>
  {isLoading 
    ? messages.loading.syncing 
    : messages.buttons.save}
</button>
```

## Adding New Messages

### 1. Open `app/utils/messages.ts`
### 2. Find the appropriate category
### 3. Add your new message

```typescript
// Example: Adding a new error message
errors: {
  // ... existing messages
  customError: "Clear, friendly description of what went wrong.",
}
```

### 4. Use it in your component

```tsx
import { messages } from "../utils/messages";

showToast(messages.errors.customError, "error");
```

## Writing Guidelines

### Do's ✅
- Be warm and human
- Use "we" and "your" perspective
- Provide actionable next steps
- Use clear, simple language
- Be encouraging and positive
- Add context to errors

### Don'ts ❌
- Don't use technical jargon
- Don't sound robotic or corporate
- Don't blame the user
- Don't use all caps
- Don't be vague about solutions
- Don't include error codes (unless debugging)

## Examples

### ❌ Bad Error Message (Technical)
```
"ECONNREFUSED: Connection refused at 192.168.1.1:5432"
```

### ✅ Good Error Message (Helpful)
```
"Connection issue. Please refresh the page and try again."
```

---

### ❌ Bad Success Message (Generic)
```
"Operation successful"
```

### ✅ Good Success Message (Celebratory)
```
"🎉 Study set created! Ready to learn?"
```

---

### ❌ Bad Loading Message (Anxious)
```
"Processing... DO NOT CLOSE THIS WINDOW"
```

### ✅ Good Loading Message (Reassuring)
```
"Creating your study cards... This usually takes about 60 seconds. Hang tight!"
```

## Testing Checklist

When adding or modifying messages, verify:
- [ ] Message appears correctly in UI
- [ ] Emoji displays properly (if included)
- [ ] Text fits within available space
- [ ] Tone matches other messages
- [ ] Message is helpful and clear
- [ ] No typos or grammatical errors
- [ ] Works in both light and dark modes (if Toast)

## Questions?

The messages system is designed to be simple and maintainable. If you need to add a new category of messages, just add a new section to the `messages` object following the same pattern.

**Remember**: Every message is an opportunity to make the user feel supported, not blamed. Write accordingly. 🌟
