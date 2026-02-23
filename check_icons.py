#!/usr/bin/env python3
import re

with open(r'c:\Users\edu8042119\studymaxx\app\page.tsx', 'rb') as f:
    content = f.read()

pattern = b"icon: '" 
for m in re.finditer(pattern, content):
    start = m.end()
    end = content.find(b"'", start)
    if end > 0:
        icon_bytes = content[start:end]
        print(f'At byte {m.start()}: hex={icon_bytes.hex()} repr={repr(icon_bytes)}')
        try:
            print(f'  as utf8: {icon_bytes.decode("utf-8")}')
        except Exception as e:
            print(f'  NOT valid utf8: {e}')
