/**
 * After All Artifact Build Hook for Electron Builder
 * This script runs after all artifacts are built
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

exports.default = async function(context) {
  const { artifactPaths, outDir } = context;
  
  console.log('📦 Post-processing artifacts...');
  
  // Create checksums for all artifacts
  for (const artifactPath of artifactPaths) {
    const fileName = path.basename(artifactPath);
    const checksumPath = path.join(outDir, `${fileName}.sha256`);
    
    try {
      // Calculate SHA256 checksum
      const fileBuffer = fs.readFileSync(artifactPath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      const hex = hashSum.digest('hex');
      
      // Write checksum file
      fs.writeFileSync(checksumPath, `${hex}  ${fileName}\n`);
      console.log(`✅ Created checksum: ${checksumPath}`);
    } catch (error) {
      console.error(`❌ Failed to create checksum for ${fileName}:`, error);
    }
  }
  
  // Create release notes template
  const releaseNotesPath = path.join(outDir, 'RELEASE_NOTES.md');
  const releaseNotes = `# Release Notes

## DocAiProduction v${context.packager.appInfo.version}

### Changes
- Bug fixes and improvements
- Performance optimizations
- UI/UX enhancements

### Installation
Download the appropriate installer for your operating system:
- Windows: \`.exe\` installer
- macOS: \`.dmg\` installer
- Linux: \`.AppImage\` or \`.deb\` package

### Verification
Verify the integrity of your download using the SHA256 checksum files.

### Support
Report issues on [GitHub Issues](https://github.com/hsnnrn/DocAiProduction/issues).
`;

  try {
    fs.writeFileSync(releaseNotesPath, releaseNotes);
    console.log('✅ Created release notes template');
  } catch (error) {
    console.error('❌ Failed to create release notes:', error);
  }
  
  console.log('🎉 Post-processing completed');
};
