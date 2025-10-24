/**
 * Post-build script
 * This script runs after all artifacts are built
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

exports.default = async function afterBuild(context) {
  console.log('📦 Post-build processing started...');

  const { artifactPaths } = context;
  
  // Generate checksums for all artifacts
  for (const artifactPath of artifactPaths) {
    try {
      const checksum = await generateChecksum(artifactPath);
      const checksumPath = `${artifactPath}.sha256`;
      
      fs.writeFileSync(checksumPath, `${checksum}  ${path.basename(artifactPath)}\n`);
      console.log(`✅ Generated checksum: ${path.basename(checksumPath)}`);
    } catch (error) {
      console.error(`❌ Failed to generate checksum for ${artifactPath}:`, error);
    }
  }

  // Generate release notes
  await generateReleaseNotes(context);

  console.log('✅ Post-build processing completed');
};

/**
 * Generate SHA256 checksum for a file
 */
async function generateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Generate release notes
 */
async function generateReleaseNotes(context) {
  try {
    const { version, artifactPaths } = context;
    
    const releaseNotes = {
      version: version,
      artifacts: artifactPaths.map(path => ({
        name: require('path').basename(path),
        size: fs.statSync(path).size,
        checksum: `${path}.sha256`
      })),
      timestamp: new Date().toISOString()
    };

    const notesPath = path.join(context.outDir, 'release-notes.json');
    fs.writeFileSync(notesPath, JSON.stringify(releaseNotes, null, 2));
    
    console.log('✅ Generated release notes');
  } catch (error) {
    console.error('❌ Failed to generate release notes:', error);
  }
}
