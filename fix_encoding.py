#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix mojibake (double-encoded UTF-8) in page.tsx
"""
import os

filepath = r'c:\Users\edu8042119\studymaxx\app\page.tsx'

# Read file as bytes
with open(filepath, 'rb') as f:
    raw = f.read()

# Check what's actually in the icon field
idx = raw.find(b"icon: '")
if idx != -1:
    snippet = raw[idx:idx+30]
    print(f"Found 'icon: ' at byte {idx}")
    print(f"Hex: {snippet.hex()}")
    print(f"Repr: {repr(snippet)}")
    # Try to decode as UTF-8
    try:
        decoded_utf8 = snippet.decode('utf-8')
        print(f"As UTF-8: {decoded_utf8}")
    except:
        print("Not valid UTF-8")
    # Try to decode as latin-1/ cp1252 
    try:
        decoded_latin1 = snippet.decode('latin-1')
        print(f"As Latin-1: {decoded_latin1}")
    except:
        print("Not valid Latin-1")

# Check for BOM
if raw[:3] == b'\xef\xbb\xbf':
    print("File has UTF-8 BOM")
else:
    print("No BOM")
