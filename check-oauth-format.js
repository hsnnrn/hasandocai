#!/usr/bin/env node

/**
 * Check Supabase OAuth Client ID Format
 * New Supabase OAuth API expects UUID format, not sba_ format
 */

const crypto = require('crypto');

function validateClientIdFormat(clientId) {
  console.log('🔍 Checking Client ID format...');
  console.log('📝 Client ID:', clientId);
  console.log('📏 Length:', clientId.length);
  
  // Check if it's a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(clientId)) {
    console.log('✅ Valid UUID format');
    return true;
  }
  
  // Check if it's the old sba_ format
  const sbaRegex = /^sba_[a-f0-9]{40}$/i;
  if (sbaRegex.test(clientId)) {
    console.log('⚠️ Old sba_ format detected');
    console.log('📋 This format is deprecated for new Supabase OAuth API');
    console.log('📋 You need to create a new OAuth application in Supabase dashboard');
    return false;
  }
  
  console.log('❌ Invalid format');
  return false;
}

function generateTestUUID() {
  return crypto.randomUUID();
}

function main() {
  console.log('🔍 Supabase OAuth Client ID Format Checker');
  console.log('=' .repeat(50));
  
  // Check current client ID from environment
  const currentClientId = 'sba_14c1108abbf7b54efcc65bea21fc51126b876c79';
  console.log('\n📋 Current Client ID Analysis:');
  validateClientIdFormat(currentClientId);
  
  console.log('\n📋 Expected Format for New Supabase OAuth API:');
  console.log('✅ UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
  console.log('❌ Old sba_ format: sba_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  
  console.log('\n📋 Example valid UUID:');
  const exampleUUID = generateTestUUID();
  console.log('🔑 Example:', exampleUUID);
  
  console.log('\n📋 Remediation Steps:');
  console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Navigate to Account Settings > OAuth Applications');
  console.log('3. Create a NEW OAuth application (not the old one)');
  console.log('4. The new application will have a UUID-format Client ID');
  console.log('5. Update your .env file with the new UUID Client ID');
  
  console.log('\n📋 OAuth Application Settings:');
  console.log('- Name: DocDataApp');
  console.log('- Redirect URI: http://localhost:54321/callback');
  console.log('- Scopes: read:organizations,read:projects,read:api-keys');
  
  console.log('\n🎯 The error "client_id: Invalid uuid" means:');
  console.log('❌ Your current Client ID is not in UUID format');
  console.log('✅ You need to create a new OAuth application');
}

main();
