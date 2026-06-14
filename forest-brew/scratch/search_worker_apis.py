import os
import sys

# Ensure UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

api_dir = 'src/app/api/worker'
for root, dirs, files in os.walk(api_dir):
    for file in files:
        if file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            print(f"=== {path} ===")
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if 'role' in line or 'DELIVERY' in line or 'ADMIN' in line:
                    # Strip emojis or just encode safely
                    safe_line = line.encode('utf-8', errors='ignore').decode('utf-8').strip()
                    print(f"  {i+1}: {safe_line}")
