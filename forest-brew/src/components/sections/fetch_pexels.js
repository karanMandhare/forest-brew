const fs = require('fs');
const https = require('https');

const urls = [
  'https://www.pexels.com/video/man-looking-at-coffea-plants-in-a-farm-7121117/',
  'https://www.pexels.com/video/a-man-making-coffee-7118140/',
  'https://www.pexels.com/video/barista-skillfully-frothing-milk-for-coffee-34505178/',
  'https://www.pexels.com/video/barista-crafting-perfect-iced-coffee-drink-34506437/',
  'https://www.pexels.com/video/close-up-view-of-coffee-grounds-in-portafilter-32653727/'
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  for (const url of urls) {
    console.log(`Fetching: ${url}`);
    try {
      const res = await fetchPage(url);
      console.log(`Status: ${res.status}`);
      // Find all matches for video-files URLs
      const regex = /https:\/\/videos\.pexels\.com\/video-files\/[^\s\"\'\>\<\,]+/g;
      const matches = res.body.match(regex) || [];
      const unique = [...new Set(matches)];
      console.log('Matches:', unique);
    } catch (e) {
      console.error('Error fetching URL:', e.message);
    }
  }
}

run();
