const https = require('https');
function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d)); }).on('error', reject);
    });
}
async function check() {
    const html = await get('https://raj3shj.github.io/MentorConnect/');
    const match = html.match(/src="(\/MentorConnect\/_expo\/static\/js\/web\/[^"]+\.js)"/);
    const bundle = await get('https://raj3shj.github.io' + match[1]);
    
    // Find the connect button handler context
    const idx = bundle.indexOf("navigate('Dashboard'");
    if (idx > -1) {
        console.log('Context around navigate Dashboard:\n', bundle.substring(idx - 200, idx + 200));
    }
    
    // Check Platform.OS check
    const idx2 = bundle.indexOf('Platform.OS');
    console.log('\nPlatform.OS found:', idx2 > -1);
    if (idx2 > -1) console.log('Context:', bundle.substring(idx2 - 50, idx2 + 100));
}
check().catch(console.error);
