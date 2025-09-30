#!/usr/bin/env node

/**
 * Fix .env BOM Issue Script
 * Removes BOM from .env file and recreates it with proper UTF-8 encoding
 */

const fs = require('fs');
const path = require('path');

function fixEnvBOM() {
  const envPath = path.resolve(process.cwd(), '.env');
  
  console.log('🔧 Fixing .env BOM issue...');
  console.log('📁 File path:', envPath);
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found');
    return;
  }
  
  try {
    // Read the file as buffer to detect BOM
    const buffer = fs.readFileSync(envPath);
    console.log('📊 File size:', buffer.length, 'bytes');
    
    // Check for BOM
    const bom = buffer.slice(0, 3);
    let hasBOM = false;
    let bomType = '';
    
    // Check for UTF-8 BOM (EF BB BF)
    if (bom[0] === 0xEF && bom[1] === 0xBB && bom[2] === 0xBF) {
      hasBOM = true;
      bomType = 'UTF-8';
    }
    // Check for UTF-16 LE BOM (FF FE)
    else if (bom[0] === 0xFF && bom[1] === 0xFE) {
      hasBOM = true;
      bomType = 'UTF-16 LE';
    }
    // Check for UTF-16 BE BOM (FE FF)
    else if (bom[0] === 0xFE && bom[1] === 0xFF) {
      hasBOM = true;
      bomType = 'UTF-16 BE';
    }
    
    if (hasBOM) {
      console.log(`❌ BOM detected: ${bomType}`);
      
      // Read content without BOM
      let content;
      if (bomType === 'UTF-16 LE' || bomType === 'UTF-16 BE') {
        // For UTF-16, we need to handle it differently
        content = buffer.toString('utf16le');
      } else {
        // For UTF-8 BOM, skip the first 3 bytes
        content = buffer.slice(3).toString('utf8');
      }
      
      // Create backup
      const backupPath = envPath + '.backup';
      fs.writeFileSync(backupPath, buffer);
      console.log('💾 Backup created:', backupPath);
      
      // Write new file without BOM
      fs.writeFileSync(envPath, content, 'utf8');
      console.log('✅ .env file fixed (BOM removed)');
      
    } else {
      console.log('✅ No BOM detected, file is clean');
    }
    
    // Verify the fix
    const newBuffer = fs.readFileSync(envPath);
    const newBom = newBuffer.slice(0, 3);
    
    if (newBom[0] === 0xEF && newBom[1] === 0xBB && newBom[2] === 0xBF) {
      console.log('⚠️ UTF-8 BOM still present');
    } else if (newBom[0] === 0xFF && newBom[1] === 0xFE) {
      console.log('⚠️ UTF-16 LE BOM still present');
    } else if (newBom[0] === 0xFE && newBom[1] === 0xFF) {
      console.log('⚠️ UTF-16 BE BOM still present');
    } else {
      console.log('✅ BOM successfully removed');
    }
    
  } catch (error) {
    console.error('❌ Error fixing .env file:', error.message);
  }
}

// Run the fix
fixEnvBOM();
