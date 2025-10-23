/**
 * After Sign Hook for Electron Builder
 * This script runs after code signing is complete
 */

const { notarize } = require('electron-notarize');

exports.default = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Skip notarization if not configured
  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
    console.log('⚠️ Skipping notarization - APPLE_ID or APPLE_ID_PASSWORD not set');
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  console.log('🍎 Starting notarization...');
  
  try {
    await notarize({
      appBundleId: 'com.hsnnrn.docaiproduction',
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
    
    console.log('✅ Notarization completed successfully');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};
