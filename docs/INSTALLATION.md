# Installation Guide

## 📋 System Requirements

### Minimum Requirements
- **RAM**: 4GB (8GB recommended)
- **Storage**: 500MB free space
- **Internet**: Required for initial setup and updates

### Platform-Specific Requirements

#### Windows
- **OS**: Windows 10 (version 1903) or later
- **Architecture**: x64 (64-bit)
- **Framework**: .NET Framework 4.7.2 or later (usually pre-installed)

#### macOS
- **OS**: macOS 10.15 (Catalina) or later
- **Architecture**: x64 or ARM64 (Apple Silicon)
- **Security**: Gatekeeper may require permission approval

#### Linux
- **OS**: Ubuntu 18.04 LTS or later, or equivalent distribution
- **Architecture**: x64 (64-bit)
- **Dependencies**: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils

## 🚀 Installation Methods

### Method 1: Direct Download (Recommended)

1. **Visit the Releases Page**
   - Go to [GitHub Releases](https://github.com/turkishdeepkebab/Docdataapp/releases/latest)
   - Download the installer for your platform

2. **Windows Installation**
   ```bash
   # Download the .exe file
   # Run the installer as administrator
   # Follow the installation wizard
   ```

3. **macOS Installation**
   ```bash
   # Download the .dmg file
   # Open the DMG file
   # Drag DocDataApp to Applications folder
   # First run: Right-click → Open (to bypass Gatekeeper)
   ```

4. **Linux Installation**
   ```bash
   # Download the .AppImage file
   chmod +x DocDataApp-*.AppImage
   ./DocDataApp-*.AppImage
   ```

### Method 2: Package Managers

#### Windows (Chocolatey)
```powershell
# Install Chocolatey first (if not installed)
# Then install DocDataApp
choco install docdataapp
```

#### macOS (Homebrew)
```bash
# Install Homebrew first (if not installed)
# Then install DocDataApp
brew install --cask docdataapp
```

#### Linux (Snap)
```bash
# Install snap first (if not installed)
sudo snap install docdataapp
```

## 🔧 Post-Installation Setup

### First Launch
1. **Launch the Application**
   - Windows: Start Menu → DocDataApp
   - macOS: Applications → DocDataApp
   - Linux: Applications menu or terminal

2. **Initial Configuration**
   - Accept license agreement
   - Configure data storage location
   - Set up user preferences
   - Connect to AI services (if required)

### Data Directory Setup
The application will create the following directories:

**Windows:**
```
C:\Users\[Username]\AppData\Roaming\DocDataApp\
├── data/
├── logs/
├── temp/
└── config/
```

**macOS:**
```
~/Library/Application Support/DocDataApp/
├── data/
├── logs/
├── temp/
└── config/
```

**Linux:**
```
~/.config/DocDataApp/
├── data/
├── logs/
├── temp/
└── config/
```

## 🔄 Auto-Update Configuration

### Enable Auto-Updates
1. Open DocDataApp
2. Go to Settings → Updates
3. Enable "Automatically check for updates"
4. Choose update channel (Stable/Beta)

### Manual Update Check
- **Windows**: Help → Check for Updates
- **macOS**: DocDataApp → Check for Updates
- **Linux**: Help → Check for Updates

## 🛠️ Advanced Installation

### Silent Installation (Windows)
```cmd
# Run installer silently
DocDataApp-Setup.exe /S /D=C:\Program Files\DocDataApp
```

### Custom Installation Path
```bash
# Linux - Custom AppImage location
mkdir -p ~/Applications
mv DocDataApp-*.AppImage ~/Applications/
chmod +x ~/Applications/DocDataApp-*.AppImage
```

### Development Installation
```bash
# Clone repository
git clone https://github.com/turkishdeepkebab/Docdataapp.git
cd Docdataapp

# Install dependencies
npm install

# Build and run
npm run build
npm start
```

## 🔒 Security Considerations

### Code Signing
- **Windows**: Installer is digitally signed
- **macOS**: App is notarized by Apple
- **Linux**: AppImage is signed with GPG

### Permissions
The application may request the following permissions:
- **File System**: Read/write access to documents
- **Network**: Internet access for AI services
- **Camera**: Document scanning (optional)
- **Microphone**: Voice commands (optional)

## 📱 Mobile Companion (Future)
- iOS app (planned)
- Android app (planned)
- Web interface (planned)

## 🆘 Installation Issues

### Common Problems

#### Windows
- **"Windows protected your PC"**: Click "More info" → "Run anyway"
- **Antivirus blocking**: Add exception in antivirus settings
- **Permission denied**: Run installer as administrator

#### macOS
- **"App can't be opened"**: Right-click → Open, or disable Gatekeeper temporarily
- **"App is damaged"**: Re-download from official source
- **Notarization issues**: Check internet connection

#### Linux
- **Permission denied**: `chmod +x DocDataApp-*.AppImage`
- **Missing dependencies**: Install required libraries
- **AppImage not running**: Check if FUSE is installed

### Getting Help
- 📧 Email: support@docdataapp.com
- 💬 Discord: [Join our community](https://discord.gg/docdataapp)
- 🐛 GitHub Issues: [Report problems](https://github.com/turkishdeepkebab/Docdataapp/issues)
- 📖 Documentation: [docs.docdataapp.com](https://docs.docdataapp.com)

## 🔄 Uninstallation

### Windows
1. Control Panel → Programs → Uninstall DocDataApp
2. Or: Start Menu → DocDataApp → Uninstall

### macOS
1. Applications → Drag DocDataApp to Trash
2. Empty Trash
3. Remove data: `rm -rf ~/Library/Application\ Support/DocDataApp`

### Linux
```bash
# Remove AppImage
rm ~/Applications/DocDataApp-*.AppImage

# Remove data
rm -rf ~/.config/DocDataApp
```

---

**Note**: This installation guide is regularly updated. For the latest information, visit our [official documentation](https://docs.docdataapp.com).
