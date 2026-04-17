const https = require('https');

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(d));
        }).on('error', reject);
    });
}

async function check() {
    const html = await get('https://raj3shj.github.io/MentorConnect/');
    const match = html.match(/src="(\/MentorConnect\/_expo\/static\/js\/web\/[^"]+\.js)"/);
    if (!match) { console.log('Bundle not found in HTML'); return; }
    
    const bundleUrl = 'https://raj3shj.github.io' + match[1];
    console.log('Bundle URL:', bundleUrl);
    
    const bundle = await get(bundleUrl);
    console.log('Bundle size:', bundle.length, 'chars');
    
    if (bundle.includes('my-students?t=')) {
        console.log('STATUS: ✅ CACHE BUSTER PRESENT - code is up to date!');
    } else if (bundle.includes('my-students')) {
        console.log('STATUS: ❌ OLD CODE - Cache buster missing. Old bundle still deployed!');
    } else {
        console.log('STATUS: ❓ my-students not found in bundle at all');
    }
}

check().catch(console.error);
