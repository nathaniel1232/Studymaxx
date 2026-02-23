# -*- coding: utf-8 -*-
"""
Fix double-encoded UTF-8 (mojibake) in page.tsx.
The file was saved with UTF-8 emoji bytes interpreted as cp1252,
then re-saved as UTF-8 — causing double-encoding.
Fix: encode each char back to cp1252 bytes, then decode bytes as UTF-8.
"""

filepath = r'c:\Users\edu8042119\studymaxx\app\page.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

before_len = len(content)

def fix_mojibake(text):
    result = []
    i = 0
    while i < len(text):
        # Try to fix sequences of 2-6 chars that are mojibake multi-byte UTF-8 sequences
        fixed = False
        for length in [6, 5, 4, 3, 2]:
            if i + length <= len(text):
                segment = text[i:i+length]
                try:
                    # Try cp1252 first (handles €, ", etc.), then latin-1 (handles all bytes)
                    try:
                        raw_bytes = segment.encode('cp1252')
                    except UnicodeEncodeError:
                        raw_bytes = segment.encode('latin-1')
                    # Try to decode those bytes as UTF-8
                    decoded = raw_bytes.decode('utf-8')
                    # Only accept if result is a single non-ASCII char (emoji or punctuation)
                    # and it's meaningfully different from the input
                    if len(decoded) <= 2 and any(ord(c) > 0x007F for c in decoded):
                        result.append(decoded)
                        i += length
                        fixed = True
                        break
                except (UnicodeEncodeError, UnicodeDecodeError):
                    pass
        if not fixed:
            result.append(text[i])
            i += 1
    return ''.join(result)

fixed_content = fix_mojibake(content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

# Count changes
orig_chars = set(content) - set(fixed_content)
new_chars = set(fixed_content) - set(content)
print(f"Done. Fixed mojibake in page.tsx")
print(f"Length: {before_len} -> {len(fixed_content)} chars (diff: {len(fixed_content)-before_len})")
print("Sample emoji in fixed content:")
for emoji in ['🧠', '📈', '⏱', '🏆', '🔄', '🇩🇪', '★', '—', '©', '·', '→', '←']:
    idx = fixed_content.find(emoji)
    if idx >= 0:
        print(f"  Found {emoji} at position {idx}")
