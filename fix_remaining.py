#!/usr/bin/env python3
"""
Fix the remaining broken emojis by replacing their raw byte sequences.
"""
filepath = r'c:\Users\edu8042119\studymaxx\app\page.tsx'

with open(filepath, 'rb') as f:
    content = f.read()

orig_len = len(content)

# Timer ⏱️ — stored as: c3a2 c28f c2b1 c3af c2b8 c28f  (broken UTF-8 of original ⏱️)
# Correct UTF-8 for ⏱️ is: e2 8f b1 ef b8 8f
broken_timer  = bytes([0xc3, 0xa2, 0xc2, 0x8f, 0xc2, 0xb1, 0xc3, 0xaf, 0xc2, 0xb8, 0xc2, 0x8f])
correct_timer = bytes([0xe2, 0x8f, 0xb1, 0xef, 0xb8, 0x8f])  # ⏱️

# Trophy 🏆 — stored as: c3b0 c5b8 c28f e280a0  ... (appears corrupt, will replace with SVG alternative)
# Actually let's use the correct 4-byte UTF-8: f09f8f86  
broken_trophy  = bytes([0xc3, 0xb0, 0xc5, 0xb8, 0xc2, 0x8f, 0xe2, 0x80, 0xa0])
correct_trophy = bytes([0xf0, 0x9f, 0x8f, 0x86])  # 🏆

# Also fix any Â© â€" etc. that may remain elsewhere using the decode approach
replacements = [
    (broken_timer, correct_timer),
    (broken_trophy, correct_trophy),
]

for broken, correct in replacements:
    count = content.count(broken)
    if count:
        content = content.replace(broken, correct)
        print(f"Fixed {count}x: {broken.hex()} -> {correct.hex()} ({correct.decode('utf-8')})")
    else:
        print(f"Not found: {broken.hex()}")

with open(filepath, 'wb') as f:
    f.write(content)

print(f"\nDone. Length: {orig_len} -> {len(content)}")
