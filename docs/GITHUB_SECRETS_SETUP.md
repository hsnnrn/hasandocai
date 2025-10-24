# GitHub Secrets Setup Guide

This guide explains how to set up the required GitHub Secrets for automated building, code signing, and releasing of DocDataApp.

## 🔐 Required Secrets

### For All Platforms

| Secret Name | Description | Required | Example |
|-------------|-------------|----------|---------|
| `GITHUB_TOKEN` | GitHub token for releases | ✅ | `ghp_xxxxxxxxxxxx` |

### For macOS Code Signing & Notarization

| Secret Name | Description | Required | Example |
|-------------|-------------|----------|---------|
| `APPLE_ID` | Apple ID email | ✅ | `developer@example.com` |
| `APPLE_ID_PASSWORD` | App-specific password | ✅ | `xxxx-xxxx-xxxx-xxxx` |
| `APPLE_TEAM_ID` | Apple Developer Team ID | ✅ | `XXXXXXXXXX` |
| `CSC_LINK` | Certificate file (base64) | ✅ | `LS0tLS1CRUdJTi...` |
| `CSC_KEY_PASSWORD` | Certificate password | ✅ | `your_password` |

### For Windows Code Signing (Optional)

| Secret Name | Description | Required | Example |
|-------------|-------------|----------|---------|
| `CSC_LINK` | Certificate file (base64) | ❌ | `LS0tLS1CRUdJTi...` |
| `CSC_KEY_PASSWORD` | Certificate password | ❌ | `your_password` |

## 🍎 macOS Setup

### 1. Apple Developer Account
1. Sign up for [Apple Developer Program](https://developer.apple.com/programs/)
2. Pay the annual fee ($99/year)
3. Note your Team ID from the membership page

### 2. Create App-Specific Password
1. Go to [Apple ID Account](https://appleid.apple.com/)
2. Sign in with your Apple ID
3. Go to "Sign-In and Security" → "App-Specific Passwords"
4. Click "Generate an app-specific password"
5. Label it "DocDataApp Notarization"
6. Copy the generated password

### 3. Create Code Signing Certificate
1. Open **Keychain Access** on your Mac
2. Go to **Keychain Access** → **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
3. Fill in the form:
   - User Email Address: Your Apple ID
   - Common Name: Your name
   - CA Email Address: Leave blank
   - Request is: Saved to disk
4. Save the certificate request file
5. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list)
6. Click "+" to create a new certificate
7. Choose "Developer ID Application" (for distribution outside App Store)
8. Upload your certificate request
9. Download the certificate
10. Double-click to install in Keychain Access

### 4. Export Certificate for GitHub
1. Open **Keychain Access**
2. Find your "Developer ID Application" certificate
3. Right-click → **Export**
4. Choose **Personal Information Exchange (.p12)** format
5. Set a password (remember this!)
6. Save the file
7. Convert to base64:
   ```bash
   base64 -i certificate.p12 | pbcopy
   ```

## 🪟 Windows Setup (Optional)

### 1. Code Signing Certificate
1. Purchase a code signing certificate from:
   - [DigiCert](https://www.digicert.com/code-signing/)
   - [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing)
   - [GlobalSign](https://www.globalsign.com/en/code-signing-certificate)
2. Follow their verification process
3. Download the certificate

### 2. Export Certificate for GitHub
1. Open **Certificate Manager** (certmgr.msc)
2. Find your code signing certificate
3. Right-click → **Export**
4. Choose **Personal Information Exchange (.pfx)** format
5. Set a password
6. Convert to base64:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx"))
   ```

## 🔧 Setting Up GitHub Secrets

### 1. Navigate to Repository Settings
1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**

### 2. Add Each Secret
1. Click **New repository secret**
2. Enter the secret name (exactly as shown in the table above)
3. Enter the secret value
4. Click **Add secret**

### 3. Verify Secrets
Your secrets list should look like this:

```
✅ GITHUB_TOKEN
✅ APPLE_ID
✅ APPLE_ID_PASSWORD
✅ APPLE_TEAM_ID
✅ CSC_LINK
✅ CSC_KEY_PASSWORD
```

## 🧪 Testing the Setup

### 1. Test Build Workflow
1. Go to **Actions** tab in your repository
2. Click **Build and Release** workflow
3. Click **Run workflow**
4. Select a version (e.g., `v1.0.0`)
5. Check the "prerelease" box for testing
6. Click **Run workflow**

### 2. Monitor the Build
1. Click on the running workflow
2. Check each job:
   - ✅ **build-windows**: Should complete successfully
   - ✅ **build-macos**: Should complete with notarization
   - ✅ **build-linux**: Should complete successfully
   - ✅ **create-release**: Should create GitHub release

### 3. Verify Release
1. Go to **Releases** page
2. Check that the release was created
3. Download and test the installers
4. Verify code signing on macOS

## 🚨 Troubleshooting

### Common Issues

#### macOS Notarization Fails
**Error**: "Notarization failed"
**Solutions**:
1. Check Apple ID credentials
2. Verify Team ID is correct
3. Ensure certificate is valid
4. Check app-specific password

#### Windows Code Signing Fails
**Error**: "Code signing failed"
**Solutions**:
1. Verify certificate is valid
2. Check certificate password
3. Ensure certificate is in correct format

#### Build Fails
**Error**: "Build failed"
**Solutions**:
1. Check all secrets are set correctly
2. Verify repository permissions
3. Check workflow file syntax

### Getting Help

If you encounter issues:

1. **Check the logs** in the Actions tab
2. **Verify secrets** are set correctly
3. **Test locally** with `npm run dist`
4. **Contact support** with error details

## 📚 Additional Resources

- [Apple Code Signing Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Electron Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [NSIS Code Signing](https://nsis.sourceforge.io/Docs/Chapter4.html#4.12.9.1)

---

**Security Note**: Never commit secrets to your repository. Always use GitHub Secrets for sensitive information.
