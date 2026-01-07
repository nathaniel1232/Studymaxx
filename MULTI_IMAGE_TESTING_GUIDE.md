# Multi-Image Upload - Testing Guide

## Implementation Summary

### ✅ What Was Built

**NEW Dedicated Endpoint:**
- `/api/process-images` - Handles ONLY image files
- Server-side OCR processing with Tesseract
- Combines text from all images in ONE response

**Frontend Changes:**
- New state: `selectedImages: File[]` (stores actual File objects)
- New handler: `handleMultiImageSelect()` (validates images only)
- New handler: `handleProcessImages()` (sends ONE request with all images)
- Updated UI: Shows selected images, process button, progress

**Backend Logic:**
- Uses `formData.getAll("images")` to get all images
- Server-side premium verification from database
- Enforces limits: Free=1, Premium=5
- Validates ONLY images (rejects PDFs, DOCX, etc.)
- Processes images sequentially with OCR
- Returns combined text

**Token Safety:**
- Server enforces limits even if frontend is bypassed
- Combined text sent to OpenAI (one API call, not per-image)
- Max 5 images keeps OCR processing time reasonable (~30-60 sec)

---

## How to Test Locally

### 1. **Basic Single Image (Free User)**

**Steps:**
1. Sign out or use a free account
2. Select "Image" material type
3. Try to select 1 image → Should work ✅
4. Try to select 2+ images → Should show error ❌

**Expected:**
- Free users can only upload 1 image
- Clear error message if multiple selected
- Image processes via OCR
- Text appears in textarea

**Edge Case:**
Try selecting a PDF when "Image" is selected:
- Should reject with "❌ Only image files allowed"

---

### 2. **Multi-Image Upload (Premium User)**

**Steps:**
1. Sign in with premium account
2. Select "Image" material type
3. Select 3-5 images at once
4. Click "Process X Image(s)" button
5. Wait for processing (30-60 seconds)

**Expected:**
- All images show in "selected" list before processing
- Progress indicator shows "Processing X image(s)..."
- All images processed sequentially
- Combined text appears in textarea
- Success message shows: "✅ Successfully extracted text from X image(s)"

**Edge Cases:**
- Try selecting 6 images → Should show error "Maximum 5 images"
- Try selecting mix of images and PDFs → Should reject non-images
- Cancel/clear images before processing → Should work cleanly

---

### 3. **Server-Side Limit Enforcement**

**Test bypassing frontend limits:**

Using browser dev tools or Postman:
```bash
# Try sending 10 images as a free user (should fail)
curl -X POST http://localhost:3000/api/process-images \
  -F "userId=YOUR_FREE_USER_ID" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg"
```

**Expected:**
- Server returns 403 error
- Error message: "Free users can upload 1 image at a time..."
- Frontend limits bypassed but server protects

---

### 4. **Regression Test: Other Material Types**

**Verify separation of concerns:**

**Test PDF Upload:**
1. Select "PDF" material type
2. Upload a PDF file
3. Should use OLD `/api/extract-text` endpoint ✅
4. Should NOT use new `/api/process-images`

**Test DOCX Upload:**
1. Select "PDF" material type (accepts DOCX too)
2. Upload DOCX file
3. Should use OLD `/api/extract-text` endpoint ✅

**Test Notes (Text Input):**
1. Select "Notes" material type
2. Type or paste text
3. Should not involve any file upload endpoints ✅

**Expected:**
- No mixing of endpoints
- Each material type uses correct handler
- No breaking changes to existing features

---

### 5. **Mixed Input Rejection**

**Try to trick the system:**

**Frontend:**
1. Select "Image" material type
2. Try drag-and-drop a PDF into the image input
3. Should reject with clear error

**Backend (via API test):**
```bash
# Send PDF to image endpoint
curl -X POST http://localhost:3000/api/process-images \
  -F "userId=USER_ID" \
  -F "images=@document.pdf"
```

**Expected:**
- Server returns 400 error
- Error: "Only image files are allowed. Invalid files: document.pdf (application/pdf)"
- Clear list of allowed types shown

---

### 6. **Error Handling**

**Test various failure modes:**

**No text in images:**
- Upload blank/empty images
- Expected: "No text could be extracted from any images"

**Partial failure:**
- Upload 3 images: 2 with text, 1 blank
- Expected: Process the 2 good ones, show warning about the failed one

**Network timeout:**
- Upload large images on slow connection
- Expected: Graceful error with retry option

**Unauthenticated:**
- Try to process images without signing in
- Expected: 401 error "Authentication required"

---

### 7. **Performance Test**

**Premium user with max images:**
1. Select 5 large images (2-5 MB each)
2. Click "Process 5 Image(s)"
3. Monitor processing time

**Expected:**
- Shows progress indicator
- Takes 30-60 seconds (acceptable)
- All images processed successfully
- UI doesn't freeze/crash
- Text combined correctly

---

## Testing Checklist

### Frontend
- [ ] Single image works for free users
- [ ] Multiple images work for premium users
- [ ] Non-image files rejected with clear error
- [ ] Selected images show in list before processing
- [ ] Process button disabled during upload
- [ ] Progress indicator shows status
- [ ] Clear all button works
- [ ] Remove individual image works
- [ ] Success message shows after processing

### Backend
- [ ] `/api/process-images` accepts authenticated requests
- [ ] Server verifies premium status from database
- [ ] Free users limited to 1 image (server-side)
- [ ] Premium users limited to 5 images (server-side)
- [ ] Only image files accepted (rejects PDF, DOCX, etc.)
- [ ] OCR processes all images sequentially
- [ ] Text combined correctly with separators
- [ ] Returns proper metadata (count, confidence, etc.)
- [ ] Handles partial failures gracefully
- [ ] Returns 403 for premium-required features

### Regression
- [ ] PDF upload still works (separate flow)
- [ ] DOCX upload still works (separate flow)
- [ ] Notes/text input still works
- [ ] YouTube URL input still works (if enabled)
- [ ] No endpoint mixing
- [ ] No breaking changes to existing features

### Security & Performance
- [ ] Server-side limits can't be bypassed
- [ ] Unauthenticated requests rejected
- [ ] File size limits enforced (10MB per image)
- [ ] Processing time reasonable (< 90 seconds for 5 images)
- [ ] Memory usage acceptable
- [ ] No token abuse possible

---

## Common Issues & Solutions

### Issue: "Authentication required"
**Solution:** Make sure you're signed in. Check that `userId` is passed to backend.

### Issue: Images taking too long
**Solution:** Expected for multiple images. OCR is CPU-intensive. Consider reducing image size before upload.

### Issue: "No text found"
**Solution:** Image quality may be poor. Try clearer/higher contrast images. Ensure images contain actual text.

### Issue: Frontend allows multiple but backend rejects
**Solution:** Frontend premium check may be cached. Clear cache and refresh. Backend is source of truth.

### Issue: PDF rejected when selecting images
**Solution:** Working as intended! Multi-image endpoint is images-only. Use PDF material type for documents.

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All tests passing locally
- [ ] Premium limits verified from database
- [ ] Error messages user-friendly
- [ ] Loading states clear
- [ ] Regression tests passed
- [ ] Server logs clean (no errors)
- [ ] Memory leaks checked
- [ ] API rate limits configured
- [ ] Monitoring/alerts set up

---

## Why This Implementation is Safe

### Token Safety
- **Server enforces limits**: Even if frontend is bypassed, max 5 images
- **Combined text**: All images → one OCR batch → one OpenAI call
- **No per-image AI calls**: Tesseract (free) does OCR, OpenAI gets final text
- **Database-verified premium**: Can't fake premium status

### Endpoint Separation
- **Images only**: `/api/process-images` rejects PDFs, DOCX
- **No mixing**: Each material type has dedicated flow
- **Fail fast**: Validation happens before expensive OCR

### Performance Limits
- **Max 5 images**: Reasonable OCR time (~30-60 sec)
- **10MB per file**: Prevents memory issues
- **Sequential processing**: Predictable resource usage

### User Experience
- **Clear feedback**: Progress indicators, success/error messages
- **Two-step process**: Select → Review → Process (prevents accidents)
- **Graceful errors**: Partial failures handled, clear next steps
