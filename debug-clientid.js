// debug-clientid.js
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const raw = process.env.SUPABASE_OAUTH_CLIENT_ID;
console.log('RAW (JSON):', JSON.stringify(raw));
const sanitized = raw ? raw.trim().replace(/(^"+|"+$)/g,'').replace(/(^\'+|\'+$)/g,'').replace(/[\u0000-\u001F\u007F-\u009F]/g,'') : null;
console.log('SANITIZED:', JSON.stringify(sanitized));
console.log('MASKED sanitized:', sanitized ? sanitized.slice(0,8)+'...'+sanitized.slice(-4) : 'MISSING');
console.log('LENGTH:', sanitized ? sanitized.length : 0);
console.log('VALID_UUID?', sanitized ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sanitized) : false);
