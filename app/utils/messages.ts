/**
 * MESSAGING SYSTEM - Human-friendly, warm, professional copy
 * 
 * This file centralizes all user-facing messages to ensure consistent
 * tone across the app. Messages should feel:
 * - Warm and human (not robotic)
 * - Clear and concise
 * - Helpful and encouraging
 * - Professional and trustworthy
 */

export const messages = {
  // ========== SUCCESS MESSAGES ==========
  success: {
    cardsSaved: "✨ All set! Your flashcards are ready to study.",
    setCreated: "🎉 Study set created! Ready to learn?",
    textExtracted: "📖 Text extracted successfully. Let's create flashcards!",
    premiumActivated: "🎉 Welcome to Premium! All features are now unlocked.",
    dataSynced: "✅ Your study sets are synced across all devices.",
    transcriptExtracted: "✅ Transcript extracted! Ready to create flashcards.",
  },

  // ========== ERROR MESSAGES - Helpful, not scary ==========
  errors: {
    // Generic/System
    systemError: "Something went wrong. Please try again. If this keeps happening, contact us.",
    networkError: "Connection lost. Please check your internet and try again.",
    tryAgain: "Let's try that again.",
    
    // Saving
    saveFailedAuth: "Please sign in to save your study set.",
    saveFailedGeneric: "Couldn't save your study set. Please try again.",
    saveFailedNetwork: "Connection issue while saving. Your work is still in the app.",
    
    // Generation
    generationFailed: "Couldn't generate flashcards. Please check your text and try again.",
    generationTimeout: "This is taking longer than expected. Please try again or use fewer flashcards.",
    generationTooShort: "Add more content to generate quality flashcards.",
    textTooShort: "Please provide at least 100 characters of text.",
    
    // Upload/OCR
    imageProcessingFailed: "Couldn't read the image text. Try a clearer image and try again.",
    pdfProcessingFailed: "Couldn't read the PDF. The file might be corrupted or protected.",
    youtubeProcessingFailed: "Couldn't get the video transcript. Please try another video.",
    uploadFailed: "File upload failed. Please try a different file.",
    fileTooLarge: "File is too large. Try a smaller file.",
    
    // Validation
    selectMaterial: "Choose how you want to create flashcards.",
    enterText: "Paste or type your notes here.",
    nameYourSet: "Give your study set a name.",
    selectCards: "Choose how many flashcards you want.",
    
    // Step validation errors
    subjectRequired: "What subject are you studying? This helps us create better flashcards.",
    materialTypeRequired: "Choose a way to add your content.",
    notesRequired: "Add some notes to create flashcards.",
    youtubeUrlRequired: "Paste a YouTube link to extract the transcript.",
    fileRequired: "Upload a file to extract text from.",
    gradeRequired: "Choose your target grade level.",
    
    // File/Upload errors
    invalidFileType: "Please upload an image, PDF, or document file.",
    tooManyImages: "That's more images than allowed. Please select fewer files.",
    premiumMultiImage: "Free users can upload 1 image at a time. Upgrade to Premium for multi-image uploads.",
    noImages: "No images selected. Please choose at least one.",
    connectionError: "Connection issue. Please refresh the page and try again.",
    signInRequired: "Please sign in to upload files.",
    
    // Content validation
    noContent: "Add some content to create flashcards.",
    notEnoughContent: "Please add more content. We need at least 20 characters to work with.",
    
    // YouTube errors
    youtubeExtraction: "Couldn't extract the transcript. Try a different video.",
    youtubeNeedsCaptions: "This video doesn't have captions. Try another video or use notes instead.",
  },

  // ========== LOADING/PROCESSING MESSAGES - Reassuring, not anxious ==========
  loading: {
    generatingCards: "Creating your flashcards... This usually takes about 60 seconds.",
    extractingText: "Reading your image... Just a moment.",
    processingMultiple: "Processing your images... Almost there.",
    syncing: "Saving your work...",
    loading: "Loading...",
  },

  // ========== INFORMATIONAL MESSAGES ==========
  info: {
    freeLimitReached: "You've reached your free study set limit. Upgrade to Premium for unlimited sets.",
    loginToSave: "Sign in to save your study sets and access them on other devices.",
    premiumFeature: "This is a Premium feature. Upgrade to unlock it.",
    tipGenerate: "Tip: More detailed notes create better flashcards.",
  },

  // ========== BUTTON TEXT ==========
  buttons: {
    create: "Create Flashcards",
    save: "Save Study Set",
    continue: "Continue",
    tryAgain: "Try Again",
    goBack: "Go Back",
    close: "Close",
    dismiss: "Dismiss",
    upgrade: "Upgrade to Premium",
    signIn: "Sign In",
    skipForNow: "Skip for now",
  },

  // ========== MODAL TITLES & DESCRIPTIONS ==========
  modals: {
    login: {
      title: "Keep Your Work Safe",
      description: "Sign in to save your study sets and sync across your devices.",
    },
    premium: {
      title: "Unlock Premium",
      description: "Get unlimited flashcards, PDF upload, YouTube, and more.",
    },
    confirmDelete: {
      title: "Delete Study Set?",
      description: "This can't be undone.",
    },
    saving: {
      title: "Saving Your Study Set",
      description: "Give your set a name so you can find it later.",
    },
  },

  // ========== EMPTY STATES ==========
  empty: {
    noSets: "No study sets yet. Create one to get started!",
    noFlashcards: "No flashcards. Add some content and generate them.",
    noHistory: "No study history yet. Start studying to see your progress.",
  },

  // ========== GUIDANCE TEXT (helpful hints) ==========
  guidance: {
    startHere: "👋 Start by choosing how you want to create flashcards.",
    bestResults: "✨ Tip: More detailed notes create better flashcards.",
    unlimitedPremium: "💡 Premium members get unlimited flashcards, PDF upload, YouTube, and more.",
    shareStudySets: "🔗 You can share study sets with friends.",
  },
};

export default messages;
