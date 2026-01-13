# Fix for "Test Degselv" Answer Lengths

## Problem
Users reported that in "Test Yourself" (Quiz) mode, the correct answer was consistently longer than the incorrect options (distractors), making it easy to guess the right answer without knowing the material.

## Changes Implemented

### 1. AI Generation (`app/api/generate/route.ts`)
Updated the prompt sent to OpenAI to strictly enforce equal length for all answer options.
- **Explicit Rule:** "The correct answer MUST NOT be the longest option."
- **Matching Logic:** Required all options to be within ±2 words of each other.
- **Adjustment Instructions:** 
  - If the correct answer is long, distractors must be padded to match.
  - If distractors are short, the correct answer must be shortened.
- **Example Added:** Provided explicit examples of good vs. bad distractors based on length.

### 2. Quiz Engine (`app/components/StudyView.tsx`)
Improved the fallback logic that selects distractors from other cards when pre-generated distractors aren't available.
- **Stricter Scoring:** Increased the point bonus for answers with identical word counts (from +3 to +5).
- **Narrower Tolerance:** Reduced the "length match" tolerance from <10 chars to <5 chars for maximum points.
- **Heavier Penalty:** Increased the penalty for length discrepancies (if diff > 15 chars, score -10).

## Verification
New flashcards generated after this update will have properly balanced answer lengths. Existing flashcards will also see improved distractor selection in quiz mode due to the frontend logic update.
