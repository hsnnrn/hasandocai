# Mac Code Signing Setup Guide

## Overview
This guide explains how to set up code signing for Mac distribution of the Document Converter application.

## Prerequisites

### 1. Apple Developer Account
- You need an active Apple Developer Program membership ($99/year)
- Sign up at: https://developer.apple.com/programs/

### 2. Developer Certificates
You need the following certificates from Apple Developer Portal:

#### Application Certificate
- **Type**: Mac App Distribution
- **Purpose**: Sign the application bundle
- **Validity**: 1 year (renewable)

#### Installer Certificate  
- **Type**: Mac Installer Distribution
- **Purpose**: Sign the installer package
- **Validity**: 1 year (renewable)

## Setup Steps

### 1. Create Certificates in Apple Developer Portal

1. Log in to [Apple Developer Portal](https://developer.apple.com/account/)
2. Go to **Certificates, Identifiers & Profiles**
3. Create a new certificate:
   - **Type**: Mac App Distribution
   - **CSR**: Upload a Certificate Signing Request (see step 2)
4. Download and install the certificate in Keychain Access

### 2. Generate Certificate Signing Request (CSR)

1. Open **Keychain Access** on your Mac
2. Go to **Keychain Access** > **Certificate Assistant** > **Request a Certificate From a Certificate Authority**
3. Fill in the form:
   - **User Email Address**: Your Apple ID email
   - **Common Name**: Your name or organization name
   - **CA Email Address**: Leave blank
   - **Request is**: Saved to disk
4. Save the CSR file

### 3. Configure Code Signing in electron-builder

Update your `electron-builder-mac.json`:

```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)",
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  }
}
```

### 4. Set Environment Variables

Create a `.env` file with your signing information:

```bash
# Code Signing
CSC_LINK=path/to/your/certificate.p12
CSC_KEY_PASSWORD=your_certificate_password
APPLE_ID=your_apple_id@example.com
APPLE_ID_PASSWORD=your_app_specific_password
APPLE_TEAM_ID=your_team_id
```

### 5. Notarization Setup

For distribution outside the Mac App Store, you need to notarize your app:

1. **Create App-Specific Password**:
   - Go to [Apple ID Account](https://appleid.apple.com/)
   - Sign in and go to **Security**
   - Generate an app-specific password for notarization

2. **Update electron-builder config**:
```json
{
  "mac": {
    "notarize": {
      "teamId": "YOUR_TEAM_ID"
    }
  }
}
```

## Build Commands

### Development Build (No Signing)
```bash
npm run build:mac
```

### Production Build (With Signing)
```bash
npm run build:mac:prod
```

### Production Build with Notarization
```bash
npm run build:mac:notarize
```

## Troubleshooting

### Common Issues

1. **"No identity found"**
   - Check that your certificate is installed in Keychain Access
   - Verify the identity name matches exactly

2. **"Invalid signature"**
   - Ensure hardened runtime is enabled
   - Check entitlements file is correct

3. **"Notarization failed"**
   - Verify Apple ID credentials
   - Check team ID is correct
   - Ensure app-specific password is valid

### Verification Commands

```bash
# Check code signature
codesign -dv --verbose=4 /path/to/your/app

# Verify signature
codesign --verify --deep --strict --verbose=2 /path/to/your/app

# Check notarization status
xcrun notarytool history --apple-id your@email.com --password your_password
```

## Security Best Practices

1. **Never commit certificates or passwords to version control**
2. **Use environment variables for sensitive data**
3. **Store certificates securely (Keychain Access)**
4. **Use app-specific passwords, not your main Apple ID password**
5. **Regularly rotate certificates and passwords**

## Distribution Options

### 1. Direct Distribution
- Build signed and notarized DMG
- Distribute via website or direct download
- Users can install without App Store

### 2. Mac App Store
- Requires additional Mac App Store certificate
- Must follow App Store guidelines
- Automatic updates via App Store

### 3. Enterprise Distribution
- For internal company use
- No notarization required
- Can be distributed via internal channels

## Next Steps

1. Set up your Apple Developer account
2. Create and install certificates
3. Configure environment variables
4. Test the build process
5. Submit for notarization
6. Distribute your application

For more information, see the [Apple Code Signing Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution).
