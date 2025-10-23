const fs = require('fs');
const path = require('path');

// Copy main.js from dist/main/main/main.js to root directory
const sourceFile = path.join(__dirname, '..', 'dist', 'main', 'main', 'main.js');
const targetFile = path.join(__dirname, '..', 'main.js');

try {
  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.error('Source file does not exist:', sourceFile);
    process.exit(1);
  }

  // Copy the file
  fs.copyFileSync(sourceFile, targetFile);
  console.log('✅ main.js copied successfully');
} catch (error) {
  console.error('❌ Error copying main.js:', error);
  process.exit(1);
}
