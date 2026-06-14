with open('src/app/worker/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r"ADMIN", text)]
for m in matches:
    start = max(0, text.rfind('\n', 0, m))
    end = text.find('\n', m)
    line_no = text[:m].count('\n') + 1
    print(f'{line_no}: {text[start:end].strip()}')
