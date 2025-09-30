#!/usr/bin/env node

/**
 * OAuth Debug Script
 * Checks SUPABASE_OAUTH_CLIENT_ID configuration and provides remediation steps
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkBOM(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const bom = buffer.slice(0, 3);
    
    // Check for UTF-8 BOM (EF BB BF)
    if (bom[0] === 0xEF && bom[1] === 0xBB && bom[2] === 0xBF) {
      return { hasBOM: true, type: 'UTF-8' };
    }
    
    // Check for UTF-16 LE BOM (FF FE)
    if (bom[0] === 0xFF && bom[1] === 0xFE) {
      return { hasBOM: true, type: 'UTF-16 LE' };
    }
    
    // Check for UTF-16 BE BOM (FE FF)
    if (bom[0] === 0xFE && bom[1] === 0xFF) {
      return { hasBOM: true, type: 'UTF-16 BE' };
    }
    
    return { hasBOM: false, type: 'No BOM detected' };
  } catch (error) {
    return { hasBOM: false, type: 'Error reading file', error: error.message };
  }
}

function validateSupabaseClientId(clientId) {
  if (!clientId) {
    return { valid: false, error: 'Client ID is empty or undefined' };
  }
  
  // Supabase OAuth Client ID format: sba_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  const supabaseClientIdRegex = /^sba_[a-f0-9]{40}$/i;
  
  if (!supabaseClientIdRegex.test(clientId)) {
    return { 
      valid: false, 
      error: `Invalid format. Expected: sba_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (40 hex chars)`,
      actual: clientId.length > 20 ? clientId.substring(0, 20) + '...' : clientId
    };
  }
  
  return { valid: true, error: null };
}

function maskClientId(clientId) {
  if (!clientId || clientId.length < 8) {
    return '***';
  }
  return clientId.substring(0, 8) + '...' + clientId.substring(clientId.length - 4);
}

function generateAuthUrl(clientId, redirectUri = 'http://localhost:54321/callback') {
  if (!clientId) {
    return null;
  }
  
  // Generate PKCE parameters
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  const state = crypto.randomBytes(16).toString('base64url');
  
  const authUrl = new URL('https://api.supabase.com/v1/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);
  
  return {
    url: authUrl.toString(),
    codeVerifier,
    codeChallenge,
    state
  };
}

function main() {
  log(colors.bold + colors.blue, '🔍 OAuth Configuration Debug Script');
  log(colors.blue, '=' .repeat(50));
  
  // Check if .env file exists
  const envPath = path.resolve(process.cwd(), '.env');
  log(colors.cyan, `📁 Checking .env file: ${envPath}`);
  
  if (!fs.existsSync(envPath)) {
    log(colors.red, '❌ .env file not found!');
    log(colors.yellow, '\n📋 Remediation Steps:');
    log(colors.yellow, '1. Create .env file in project root');
    log(colors.yellow, '2. Add your Supabase OAuth credentials:');
    log(colors.yellow, '   SUPABASE_OAUTH_CLIENT_ID=sba_your_client_id_here');
    log(colors.yellow, '   SUPABASE_OAUTH_CLIENT_SECRET=your_client_secret_here');
    log(colors.yellow, '3. Get credentials from: https://supabase.com/dashboard/account/oauth');
    log(colors.yellow, '4. Restart your application');
    return;
  }
  
  // Check for BOM
  log(colors.cyan, '🔍 Checking for BOM (Byte Order Mark)...');
  const bomCheck = checkBOM(envPath);
  if (bomCheck.hasBOM) {
    log(colors.red, `❌ BOM detected: ${bomCheck.type}`);
    log(colors.yellow, '📋 To fix BOM issue:');
    log(colors.yellow, '1. Open .env file in a text editor');
    log(colors.yellow, '2. Save as UTF-8 without BOM');
    log(colors.yellow, '3. Or recreate the file:');
    log(colors.yellow, '   echo SUPABASE_OAUTH_CLIENT_ID=sba_your_id > .env');
    log(colors.yellow, '   echo SUPABASE_OAUTH_CLIENT_SECRET=your_secret >> .env');
  } else {
    log(colors.green, `✅ No BOM detected: ${bomCheck.type}`);
  }
  
  // Load and parse .env file
  log(colors.cyan, '📖 Loading .env file...');
  let envContent;
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
    log(colors.green, '✅ .env file loaded successfully');
  } catch (error) {
    log(colors.red, `❌ Error reading .env file: ${error.message}`);
    return;
  }
  
  // Parse environment variables
  const envVars = {};
  const lines = envContent.split('\n');
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        const value = trimmedLine.substring(equalIndex + 1).trim();
        envVars[key] = value;
      }
    }
  });
  
  log(colors.cyan, `📊 Found ${Object.keys(envVars).length} environment variables`);
  
  // Check SUPABASE_OAUTH_CLIENT_ID
  const clientId = envVars.SUPABASE_OAUTH_CLIENT_ID;
  log(colors.cyan, '\n🔑 Checking SUPABASE_OAUTH_CLIENT_ID...');
  
  if (!clientId) {
    log(colors.red, '❌ SUPABASE_OAUTH_CLIENT_ID not found in .env file');
    log(colors.yellow, '\n📋 Remediation Steps:');
    log(colors.yellow, '1. Add SUPABASE_OAUTH_CLIENT_ID to your .env file');
    log(colors.yellow, '2. Get your Client ID from: https://supabase.com/dashboard/account/oauth');
    log(colors.yellow, '3. Format: SUPABASE_OAUTH_CLIENT_ID=sba_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    return;
  }
  
  log(colors.blue, `📝 Client ID (masked): ${maskClientId(clientId)}`);
  log(colors.blue, `📏 Length: ${clientId.length} characters`);
  
  // Validate Client ID format
  const validation = validateSupabaseClientId(clientId);
  if (!validation.valid) {
    log(colors.red, `❌ Invalid Client ID format: ${validation.error}`);
    if (validation.actual) {
      log(colors.red, `   Actual value: ${validation.actual}`);
    }
    log(colors.yellow, '\n📋 Remediation Steps:');
    log(colors.yellow, '1. Check your Supabase OAuth application settings');
    log(colors.yellow, '2. Ensure Client ID starts with "sba_" followed by 40 hex characters');
    log(colors.yellow, '3. Recreate OAuth application if needed');
    return;
  }
  
  log(colors.green, '✅ Client ID format is valid');
  
  // Check Client Secret
  const clientSecret = envVars.SUPABASE_OAUTH_CLIENT_SECRET;
  log(colors.cyan, '\n🔐 Checking SUPABASE_OAUTH_CLIENT_SECRET...');
  
  if (!clientSecret) {
    log(colors.yellow, '⚠️ SUPABASE_OAUTH_CLIENT_SECRET not found (optional for PKCE flow)');
  } else {
    log(colors.green, `✅ Client Secret found (masked): ${clientSecret.substring(0, 8)}...`);
  }
  
  // Generate and display auth URL
  log(colors.cyan, '\n🔗 Generating OAuth Authorization URL...');
  const authData = generateAuthUrl(clientId);
  
  if (authData) {
    log(colors.green, '✅ Authorization URL generated successfully');
    log(colors.blue, `🌐 Auth URL: ${authData.url}`);
    log(colors.blue, `🔑 Code Verifier: ${authData.codeVerifier.substring(0, 20)}...`);
    log(colors.blue, `🔑 Code Challenge: ${authData.codeChallenge.substring(0, 20)}...`);
    log(colors.blue, `🔑 State: ${authData.state}`);
  } else {
    log(colors.red, '❌ Failed to generate authorization URL');
  }
  
  // Check other important variables
  log(colors.cyan, '\n📋 Other Environment Variables:');
  const importantVars = [
    'OAUTH_PORT',
    'REDIRECT_URI_LOCAL',
    'REDIRECT_URI_CUSTOM',
    'NODE_ENV',
    'DEBUG_OAUTH'
  ];
  
  importantVars.forEach(varName => {
    const value = envVars[varName];
    if (value) {
      log(colors.green, `✅ ${varName}: ${value}`);
    } else {
      log(colors.yellow, `⚠️ ${varName}: not set (using default)`);
    }
  });
  
  // Final status
  log(colors.cyan, '\n📊 Summary:');
  if (validation.valid) {
    log(colors.green, '✅ OAuth configuration appears to be valid');
    log(colors.green, '✅ Ready for OAuth flow');
  } else {
    log(colors.red, '❌ OAuth configuration has issues');
    log(colors.red, '❌ Please fix the issues above before proceeding');
  }
  
  log(colors.blue, '\n' + '='.repeat(50));
  log(colors.bold + colors.green, '🎉 Debug script completed!');
}

// Run the debug script
main();
