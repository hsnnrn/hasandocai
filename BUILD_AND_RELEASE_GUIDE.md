# DocAiProduction Build and Release Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Development Setup](#development-setup)
4. [Build Process](#build-process)
5. [Release Process](#release-process)
6. [GitHub Actions Workflows](#github-actions-workflows)
7. [Auto-Update System](#auto-update-system)
8. [Troubleshooting](#troubleshooting)

## 🎯 Overview

This guide explains how to build, package, and release DocAiProduction using the automated GitHub Actions workflow system. The project includes:

- **Automated CI/CD** with GitHub Actions
- **Cross-platform builds** (Windows, macOS, Linux)
- **Automatic updates** with electron-updater
- **Code signing** and **notarization** (macOS)
- **Release automation** with semantic versioning

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- GitHub repository with Actions enabled

### One-Command Setup

```bash
# Linux/macOS
chmod +x scripts/setup.sh
./scripts/setup.sh

# Windows
scripts\setup.bat
```

## 🛠️ Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/hsnnrn/DocAiProduction.git
cd DocAiProduction
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

Required environment variables:
```env
# Supabase Configuration
SUPABASE_OAUTH_CLIENT_ID=your_client_id_here
SUPABASE_OAUTH_CLIENT_SECRET=your_client_secret_here
SUPABASE_PROJECT_REF=your_project_ref

# GitHub Configuration (for releases)
GITHUB_TOKEN=your_github_token_here

# macOS Code Signing (optional)
APPLE_ID=your_apple_id
APPLE_ID_PASSWORD=your_app_specific_password
APPLE_TEAM_ID=your_team_id
```

### 4. Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Create installers
npm run dist

# Run tests
npm test
```

## 🔨 Build Process

### Local Builds

#### Windows
```bash
npm run dist:win
```

#### macOS
```bash
npm run dist:mac
```

#### Linux
```bash
npm run dist:linux
```

#### All Platforms
```bash
npm run dist:all
```

### Build Output

Builds are created in the `dist/` directory:

```
dist/
├── DocAiProduction-Setup-1.0.0.exe          # Windows installer
├── DocAiProduction-1.0.0.dmg                # macOS installer
├── DocAiProduction-1.0.0.AppImage           # Linux AppImage
├── DocAiProduction-1.0.0.deb                # Linux Debian package
├── windows-checksums.txt                     # Windows checksums
├── macos-checksums.txt                       # macOS checksums
└── linux-checksums.txt                       # Linux checksums
```

## 🚀 Release Process

### Automated Release (Recommended)

The GitHub Actions workflow automatically creates releases when you push a tag:

```bash
# Create a new release
npm run release:patch  # 1.0.0 → 1.0.1
npm run release:minor  # 1.0.0 → 1.1.0
npm run release:major  # 1.0.0 → 2.0.0
```

This will:
1. Update `package.json` version
2. Create a git tag
3. Push to GitHub
4. Trigger the build workflow
5. Create a GitHub release with installers

### Manual Release

```bash
# 1. Update version in package.json
npm version patch

# 2. Push changes and tags
git push origin main
git push origin --tags

# 3. The GitHub Actions workflow will automatically build and release
```

### Pre-release/Beta Releases

```bash
# Create a beta release
npm version prerelease --preid=beta

# Push the beta tag
git push origin main
git push origin --tags
```

## 🔄 GitHub Actions Workflows

### Build Workflow (`.github/workflows/build.yml`)

**Triggers:**
- Push to `main` branch
- Push of tags starting with `v`
- Manual workflow dispatch

**Jobs:**
1. **build-mac** - Builds macOS installer (.dmg)
2. **build-windows** - Builds Windows installer (.exe)
3. **build-linux** - Builds Linux packages (.AppImage, .deb)
4. **create-release** - Creates GitHub release with all artifacts
5. **update-readme** - Updates README badges
6. **cleanup** - Cleans up build artifacts

### Release Workflow (`.github/workflows/release.yml`)

**Triggers:**
- Manual workflow dispatch

**Features:**
- Semantic versioning
- Changelog generation
- Automated tagging
- Build triggering

## 🔄 Auto-Update System

### Configuration

The app includes automatic update functionality using `electron-updater`:

```typescript
// Auto-updater configuration
autoUpdater.checkForUpdatesAndNotify();
autoUpdater.autoDownload = false; // Let user decide
autoUpdater.autoInstallOnAppQuit = true;
```

### Update Flow

1. **Check for updates** on app startup
2. **Notify user** when update is available
3. **Download update** in background
4. **Install update** on app restart

### Manual Update Check

Users can manually check for updates from the app menu or settings.

## 🛠️ Configuration Files

### package.json Build Configuration

```json
{
  "build": {
    "appId": "com.hsnnrn.docaiproduction",
    "productName": "DocAiProduction",
    "publish": {
      "provider": "github",
      "owner": "hsnnrn",
      "repo": "DocAiProduction"
    },
    "mac": {
      "target": ["dmg"],
      "category": "public.app-category.productivity"
    },
    "win": {
      "target": ["nsis"],
      "publisherName": "hsnnrn"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Office"
    }
  }
}
```

### electron-builder.yml

Additional build configuration for advanced settings.

### Build Hooks

- `build/afterSign.js` - Post-signing tasks (notarization)
- `build/afterAllArtifactBuild.js` - Post-build tasks (checksums)

## 🔐 Security and Signing

### Code Signing

#### Windows
- Requires a code signing certificate
- Configure in GitHub Secrets: `CSC_LINK`, `CSC_KEY_PASSWORD`

#### macOS
- Requires Apple Developer account
- Configure office Secrets: `APPLE_ID`, `APPLE_ID_PASSWORD`, `APPLE_TEAM_ID`

### Notarization (macOS)

Automatic notarization is configured in the build hooks:

```javascript
await notarize({
  appBundleId: 'com.hsnnrn.docaiproduction',
  appPath: `${appOutDir}/${appName}.app`,
  appleId: process.env.APPLE_ID,
  appleIdPassword: process.env.APPLE_ID_PASSWORD,
  teamId: process.env.APPLE_TEAM_ID,
});
```

## 📊 Monitoring and Analytics

### Build Status

Monitor build status on the GitHub Actions tab:
- ✅ Successful builds
- ❌ Failed builds
- ⏳ Running builds

### Release Metrics

Track release metrics:
- Download counts
- User adoption
- Update success rates

## 🐛 Troubleshooting

### Common Build Issues

#### Build Fails on macOS
```bash
# Check Xcode Command Line Tools
xcode-select --install

# Check code signing certificates
security find-identity -v -p codesigning
```

#### Build Fails on Windows
```bash
# Check Windows SDK
npm install --global windows-build-tools

# Check Visual Studio Build Tools
npm install --global @microsoft/rush-stack-compiler-3.9
```

#### Build Fails on Linux
```bash
# Install required dependencies
sudo apt-get install libnss3-dev libatk-bridge2.0-dev libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2
```

### GitHub Actions Issues

#### Workflow Fails
1. Check GitHub Actions logs
2. Verify secrets are set correctly
3. Check repository permissions
4. Verify workflow syntax

#### Release Creation Fails
1. Check `GITHUB_TOKEN` permissions
2. Verify repository has releases enabled
3. Check tag format (must start with `v`)

### Auto-Update Issues

#### Updates Not Downloading
1. Check internet connection
2. Verify GitHub access
3. Check firewall settings
4. Verify update server configuration

#### Update Installation Fails
1. Check file permissions
2. Verify disk space
3. Check antivirus interference
4. Restart application

## 📚 Additional Resources

### Documentation
- [Electron Builder Documentation](https://www.electron.build/)
- [Electron Updater Documentation](https://github.com/electron-userland/electron-updater)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### Community
- [Electron Discord](https://discord.gg/electron)
- [GitHub Issues](https://github.com/hsnnrn/DocAiProduction/issues)
- [GitHub Discussions](https://github.com/hsnnrn/DocAiProduction/discussions)

---

**Need help?** Create an [issue](https://github.com/hsnnrn/DocAiProduction/issues) or join our [discussions](https://github.com/hsnnrn/DocAiProduction/discussions)!
