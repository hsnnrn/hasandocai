#!/usr/bin/env node

/**
 * Create .env file with proper UTF-8 encoding (no BOM)
 */

const fs = require('fs');
const path = require('path');

function createEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  
  console.log('🔧 Creating .env file...');
  console.log('📁 File path:', envPath);
  
  const envContent = `# Supabase OAuth Configuration
# Bu değerleri Supabase Dashboard'dan alın
SUPABASE_OAUTH_CLIENT_ID=sba_14c1108abbf7b54efcc65bea21fc51126b876c79
SUPABASE_OAUTH_CLIENT_SECRET=your_client_secret_here

# OAuth Server Configuration
OAUTH_PORT=54321

# Redirect URI'lar (Supabase Dashboard'da tanımlanmalı)
REDIRECT_URI_LOCAL=http://localhost:54321/callback
REDIRECT_URI_CUSTOM=myapp://oauth/callback

# Keytar Service Configuration
SERVICE_NAME=DocDataApp

# Optional: Supabase Management API Base URL
SUPABASE_API_BASE_URL=https://api.supabase.com/v1

# Optional: OAuth Scopes (virgülle ayrılmış)
OAUTH_SCOPES=read:organizations,read:projects,read:api-keys,read:storage,read:functions

# Development Mode
NODE_ENV=development

# Optional: Debug Mode (OAuth flow için detaylı loglar)
DEBUG_OAUTH=true
`;

  try {
    // Write file with UTF-8 encoding (no BOM)
    fs.writeFileSync(envPath, envContent, { encoding: 'utf8' });
    console.log('✅ .env file created successfully');
    
    // Verify the file
    const stats = fs.statSync(envPath);
    console.log('📊 File size:', stats.size, 'bytes');
    
    // Check for BOM
    const buffer = fs.readFileSync(envPath);
    const bom = buffer.slice(0, 3);
    
    if (bom[0] === 0xEF && bom[1] === 0xBB && bom[2] === 0xBF) {
      console.log('⚠️ UTF-8 BOM detected');
    } else if (bom[0] === 0xFF && bom[1] === 0xFE) {
      console.log('⚠️ UTF-16 LE BOM detected');
    } else if (bom[0] === 0xFE && bom[1] === 0xFF) {
      console.log('⚠️ UTF-16 BE BOM detected');
    } else {
      console.log('✅ No BOM detected - file is clean');
    }
    
    // Test reading the file
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    console.log('📋 Environment variables found:', lines.filter(line => line.includes('=')).length);
    
    // Check if CLIENT_ID is properly set
    const clientIdLine = lines.find(line => line.startsWith('SUPABASE_OAUTH_CLIENT_ID='));
    if (clientIdLine) {
      const clientId = clientIdLine.split('=')[1];
      console.log('🔑 CLIENT_ID found:', clientId.substring(0, 8) + '...' + clientId.substring(clientId.length - 4));
      console.log('🔑 CLIENT_ID length:', clientId.length);
      
      // Validate format
      const supabaseClientIdRegex = /^sba_[a-f0-9]{40}$/i;
      if (supabaseClientIdRegex.test(clientId)) {
        console.log('✅ CLIENT_ID format is valid');
      } else {
        console.log('❌ CLIENT_ID format is invalid');
      }
    } else {
      console.log('❌ CLIENT_ID not found in file');
    }
    
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }
}

// Run the script
createEnvFile();
