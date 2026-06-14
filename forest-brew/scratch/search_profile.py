with open('src/app/profile/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r"status === 'unauthenticated'", text)]
for m in matches:
    start = max(0, text.rfind('\n', 0, m))
    end = text.find('\n', m)
    line_no = text[:m].count('\n') + 1
    print(f'{line_no}: {text[start:end].strip()}')

matches_ret = [m.start() for m in re.finditer(r"return \(", text)]
for m in matches_ret[:5]:
    start = max(0, text.rfind('\n', 0, m))
    end = text.find('\n', m)
    line_no = text[:m].count('\n') + 1
    print(f'Return at {line_no}: {text[start:end].strip()}')
