# DocDataApp Installation Guide

## 📋 System Requirements

### Minimum Requirements
- **Windows**: Windows 10 (version 1903) or later, 64-bit
- **macOS**: macOS 10.15 (Catalina) or later, Intel or Apple Silicon
- **Linux**: Ubuntu 18.04 LTS or equivalent, 64-bit
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 500 MB free space
- **Internet**: Required for initial setup and updates

### Recommended Requirements
- **RAM**: 8 GB or more
- **Storage**: 2 GB free space
- **Internet**: Stable connection for AI features

## 🚀 Quick Installation

### Windows Installation

1. **Download the installer**
   - Go to [GitHub Releases](https://github.com/turkishdeepkebab/Docdataapp/releases/latest)
   - Download `DocDataApp-Setup-v1.0.0.exe`

2. **Run the installer**
   - Double-click the downloaded `.exe` file
   - If Windows SmartScreen appears, click "More info" → "Run anyway"
   - Follow the installation wizard

3. **Complete setup**
   - Choose installation directory (default: `C:\Program Files\DocDataApp`)
   - Select additional options (desktop shortcut, start menu)
   - Click "Install"

4. **Launch the application**
   - Find "DocDataApp" in your Start Menu
   - Or double-click the desktop shortcut

### macOS Installation

1. **Download the DMG**
   - Go to [GitHub Releases](https://github.com/turkishdeepkebab/Docdataapp/releases/latest)
   - Download `DocDataApp-v1.0.0.dmg`

2. **Install the application**
   - Double-click the downloaded `.dmg` file
   - Drag "DocDataApp" to the Applications folder
   - Eject the DMG file

3. **First launch**
   - Open Applications folder
   - Find and double-click "DocDataApp"
   - If macOS shows a security warning:
     - Go to System Preferences → Security & Privacy
     - Click "Open Anyway" next to DocDataApp

### Linux Installation

#### AppImage (Recommended)
1. **Download the AppImage**
   - Go to [GitHub Releases](https://github.com/turkishdeepkebab/Docdataapp/releases/latest)
   - Download `DocDataApp-v1.0.0.AppImage`

2. **Make it executable**
   ```bash
   chmod +x DocDataApp-v1.0.0.AppImage
   ```

3. **Run the application**
   ```bash
   ./DocDataApp-v1.0.0.AppImage
   ```

#### Debian Package
1. **Download the DEB package**
   - Download `DocDataApp-v1.0.0.deb`

2. **Install using package manager**
   ```bash
   sudo dpkg -i DocDataApp-v1.0.0.deb
   sudo apt-get install -f  # Fix dependencies if needed
   ```

## 🔧 Advanced Installation

### Portable Installation (Windows)
1. Download `DocDataApp-v1.0.0.zip`
2. Extract to your desired location
3. Run `DocDataApp.exe` directly
4. No installation required - fully portable

### Manual Installation (macOS)
1. Download `DocDataApp-v1.0.0.zip`
2. Extract the archive
3. Move `DocDataApp.app` to `/Applications`
4. Run from Applications folder

## 🔍 Verification

### Verify Installation
After installation, verify that DocDataApp is working correctly:

1. **Launch the application**
2. **Check system requirements**
   - Go to Help → System Information
   - Verify all requirements are met

3. **Test basic functionality**
   - Try opening a document
   - Test the AI analysis features
   - Check if updates are working

### Verify Checksums
For security, verify the integrity of downloaded files:

**Windows:**
```powershell
Get-FileHash DocDataApp-Setup-v1.0.0.exe -Algorithm SHA256
```

**macOS/Linux:**
```bash
sha256sum DocDataApp-v1.0.0.dmg
```

Compare the output with the checksum files provided in the release.

## 🔄 Auto-Updates

DocDataApp includes automatic update functionality:

- **Windows**: Updates are downloaded and installed automatically
- **macOS**: Updates are downloaded and installed automatically
- **Linux**: Manual updates required (download new AppImage/DEB)

### Update Settings
- Go to Settings → Updates
- Choose update preferences:
  - Automatic updates (recommended)
  - Notify before downloading
  - Manual updates only

## 🛠️ Troubleshooting Installation

### Common Issues

#### Windows
**Issue**: "Windows protected your PC" message
**Solution**: 
1. Click "More info"
2. Click "Run anyway"
3. Or disable SmartScreen temporarily

**Issue**: Installation fails with "Access denied"
**Solution**:
1. Run installer as Administrator
2. Or choose a different installation directory

#### macOS
**Issue**: "App can't be opened because it is from an unidentified developer"
**Solution**:
1. Right-click the app → "Open"
2. Or go to System Preferences → Security & Privacy → "Open Anyway"

**Issue**: App crashes on launch
**Solution**:
1. Check Console.app for error messages
2. Try running from Terminal: `/Applications/DocDataApp.app/Contents/MacOS/DocDataApp`

#### Linux
**Issue**: "Permission denied" when running AppImage
**Solution**:
```bash
chmod +x DocDataApp-v1.0.0.AppImage
```

**Issue**: Missing dependencies
**Solution**:
```bash
sudo apt-get update
sudo apt-get install libfuse2 libgtk-3-0 libx11-xcb1
```

### Getting Help

If you encounter issues during installation:

1. **Check the logs**
   - Windows: `%APPDATA%\DocDataApp\logs\`
   - macOS: `~/Library/Logs/DocDataApp/`
   - Linux: `~/.config/DocDataApp/logs/`

2. **Report the issue**
   - Go to [GitHub Issues](https://github.com/turkishdeepkebab/Docdataapp/issues)
   - Include your system information and error logs

3. **Contact support**
   - Email: support@docdataapp.com
   - Discord: [Join our community](https://discord.gg/docdataapp)

## 📚 Additional Resources

- [User Manual](USER_MANUAL.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [API Documentation](API.md)
- [GitHub Repository](https://github.com/turkishdeepkebab/Docdataapp)

---

**Need help?** Check our [FAQ](https://github.com/turkishdeepkebab/Docdataapp/wiki/FAQ) or [contact support](mailto:support@docdataapp.com).
