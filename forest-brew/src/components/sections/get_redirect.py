import urllib.request
import re

urls = [
    'https://www.pexels.com/video/man-looking-at-coffea-plants-in-a-farm-7121117/',
    'https://www.pexels.com/video/a-man-making-coffee-7118140/',
    'https://www.pexels.com/video/barista-skillfully-frothing-milk-for-coffee-34505178/',
    'https://www.pexels.com/video/barista-crafting-perfect-iced-coffee-drink-34506437/',
    'https://www.pexels.com/video/close-up-view-of-coffee-grounds-in-portafilter-32653727/'
]

for url in urls:
    print("Fetching:", url)
    req = urllib.request.Request(
        url, 
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }
    )
    try:
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            # Look for video CDN URLs
            found = re.findall(r'https://videos\.pexels\.com/video-files/[^\s"\'><,]+', html)
            unique = list(set(found))
            print("Status: 200, Found URLs count:", len(unique))
            for u in unique:
                if 'hd' in u or 'sd' in u or 'mp4' in u:
                    print("  ->", u)
    except Exception as e:
        print("Status: Error,", e)
