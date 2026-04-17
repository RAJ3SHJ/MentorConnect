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
    console.log('Bundle:', match[1].split('/').pop());
    
    const bundle = await get(bundleUrl);
    
    const checks = [
        ['Cache buster present', 'my-students?t='],
        ['Auto-navigate to Dashboard', "navigate('Dashboard'"],
        ['Skip Alert.alert on web', "Platform.OS==='web'"],
        ['Connect endpoint called', "mentor/connect/"],
    ];
    
    for (const [label, search] of checks) {
        console.log(bundle.includes(search) ? `✅ ${label}` : `❌ ${label} MISSING`);
    }
}

check().catch(console.error);
