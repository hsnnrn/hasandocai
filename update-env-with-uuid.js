#!/usr/bin/env node

/**
 * Update .env file with UUID format Client ID
 * This script will prompt you to enter the new UUID Client ID
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function updateEnvWithUUID() {
  console.log('🔧 Supabase OAuth Client ID Updater');
  console.log('=' .repeat(50));
  console.log('📋 Current issue: Your Client ID is in old sba_ format');
  console.log('📋 New Supabase OAuth API requires UUID format');
  console.log('');
  console.log('📋 Steps to get new UUID Client ID:');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Navigate to: Account Settings > OAuth Applications');
  console.log('3. Click: "Create New OAuth Application"');
  console.log('4. Name: DocDataApp');
  console.log('5. Redirect URI: http://localhost:54321/callback');
  console.log('6. Scopes: read:organizations,read:projects,read:api-keys,read:storage,read:functions');
  console.log('7. Copy the new Client ID (UUID format)');
  console.log('');
  
  rl.question('🔑 Enter your new UUID Client ID: ', (newClientId) => {
    if (!newClientId || newClientId.trim() === '') {
      console.log('❌ No Client ID provided');
      rl.close();
      return;
    }
    
    const clientId = newClientId.trim();
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientId)) {
      console.log('❌ Invalid UUID format');
      console.log('📋 Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      console.log('📋 Example: 12345678-1234-1234-1234-123456789abc');
      rl.close();
      return;
    }
    
    console.log('✅ Valid UUID format detected');
    
    // Update .env file
    const envPath = path.resolve(process.cwd(), '.env');
    
    try {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Replace the old client ID with new one
      envContent = envContent.replace(
        /SUPABASE_OAUTH_CLIENT_ID=.*/,
        `SUPABASE_OAUTH_CLIENT_ID=${clientId}`
      );
      
      fs.writeFileSync(envPath, envContent, 'utf8');
      
      console.log('✅ .env file updated successfully');
      console.log('🔑 New Client ID:', clientId.substring(0, 8) + '...' + clientId.substring(clientId.length - 4));
      
      console.log('');
      console.log('📋 Next steps:');
      console.log('1. Get your Client Secret from Supabase dashboard');
      console.log('2. Update SUPABASE_OAUTH_CLIENT_SECRET in .env file');
      console.log('3. Restart your application');
      
    } catch (error) {
      console.error('❌ Error updating .env file:', error.message);
    }
    
    rl.close();
  });
}

// Run the updater
updateEnvWithUUID();
