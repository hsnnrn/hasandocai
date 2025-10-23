# DocAiProduction Installation Guide

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Download Instructions](#download-instructions)
3. [Platform-Specific Installation](#platform-specific-installation)
4. [Post-Installation Setup](#post-installation-setup)
5. [Troubleshooting](#troubleshooting)
6. [Uninstallation](#uninstallation)

## 🖥️ System Requirements

### Minimum Requirements

| Component | Windows | macOS | Linux |
|-----------|---------|-------|-------|
| **OS Version** | Windows 10 (1903+) | macOS 10.14 (Mojave) | Ubuntu 18.04+ / Fedora 30+ |
| **Architecture** | x64 | x64 / ARM64 | x64 |
| **RAM** | 4GB | 4GB | 4GB |
| **Storage** | 500MB | 500MB | 500MB |
| **Network** | Internet connection | Internet connection | Internet connection |

### Recommended Requirements

| Component | Windows | macOS | Linux |
|-----------|---------|-------|-------|
| **OS Version** | Windows 11 | macOS 12+ | Ubuntu 20.04+ / Fedora 35+ |
| **Architecture** | x64 | x64 / ARM64 | x64 |
| **RAM** | 8GB+ | 8GB+ | 8GB+ |
| **Storage** | 2GB+ | 2GB+ | 2GB+ |
| **Network** | Stable broadband | Stable broadband | Stable broadband |

## 📥 Download Instructions

### Method 1: Direct Download (Recommended)

1. Go to the [GitHub Releases](https://github.com/hsnnrn/DocAiProduction/releases/latest) page
2. Find your operating system in the "Assets" section
3. Download the appropriate installer:
   - **Windows**: `DocAiProduction-Setup-*.exe`
   - **macOS**: `DocAiProduction-*.dmg`
   - **Linux**: `DocAiProduction-*.AppImage` or `DocAiProduction-*.deb`

### Method 2: Using Command Line

#### Windows (PowerShell)
```powershell
# Download latest release
$url = "https://github.com/hsnnrn/DocAiProduction/releases/latest/download/DocAiProduction-Setup-windows.exe"
Invoke-WebRequest -Uri $url -OutFile "DocAiProduction-Setup.exe"
```

#### macOS/Linux (Terminal)
```bash
# Download latest release
curl -L -o "DocAiProduction.dmg" "https://github.com/hsnnrn/DocAiProduction/releases/latest/download/DocAiProduction-mac.dmg"
```

## 🖥️ Platform-Specific Installation

### Windows Installation

#### Using the Installer (.exe)

1. **Download** the `.exe` installer
2. **Right-click** the installer and select "Run as administrator"
3. **Follow** the installation wizard:
   - Accept the license agreement
   - Choose installation directory (default: `C:\Program Files\DocAiProduction`)
   - Select additional tasks (desktop shortcut, start menu entry)
4. **Complete** the installation
5. **Launch** from Start Menu or desktop shortcut

#### Silent Installation (IT Administrators)

```powershell
# Silent installation
.\DocAiProduction-Setup.exe /S

# Custom installation directory
.\DocAiProduction-Setup.exe /S /D=C:\CustomPath\DocAiProduction
```

### macOS Installation

#### Using the DMG File

1. **Download** the `.dmg` file
2. **Open** the downloaded DMG file
3. **Drag** DocAiProduction to your Applications folder
4. **Eject** the DMG file
5. **Launch** from Applications folder or Spotlight

#### Using Homebrew (Alternative)

```bash
# Add tap (if available)
brew tap hsnnrn/docaiproduction

# Install
brew install --cask docaiproduction
```

### Linux Installation

#### AppImage (Universal)

1. **Download** the `.AppImage` file
2. **Make executable**:
   ```bash
   chmod +x DocAiProduction-*.AppImage
   ```
3. **Run**:
   ```bash
   ./DocAiProduction-*.AppImage
   ```

#### Debian/Ubuntu (.deb Package)

1. **Download** the `.deb` package
2. **Install** using dpkg:
   ```bash
   sudo dpkg -i DocAiProduction-*.deb
   ```
3. **Fix dependencies** (if needed):
   ```bash
   sudo apt-get install -f
   ```

#### Fedora/RHEL (.rpm Package)

1. **Download** the `.rpm` package
2. **Install** using dnf:
   ```bash
   sudo dnf install DocAiProduction-*.rpm
   ```

## ⚙️ Post-Installation Setup

### First Launch

1. **Launch** DocAiProduction
2. **Accept** the license agreement
3. **Configure** initial settings
4. **Check for updates** (automatic)

### Configuration

#### Network Settings
- Ensure internet access for updates
- Configure proxy settings if needed
- Allow firewall exceptions

#### Auto-Update Settings
- Updates are enabled by default
- Check for updates on startup
- Download updates automatically
- Install on application restart

## 🔧 Troubleshooting

### Common Installation Issues

#### Windows Issues

**"Windows protected your PC" Warning**
```
Solution:
1. Click "More info"
2. Click "Run anyway"
3. This is normal for unsigned applications
```

**Installation Fails with "Access Denied"**
```
Solution:
1. Run installer as Administrator
2. Check disk space (need 500MB+)
3. Disable antivirus temporarily
4. Check Windows version compatibility
```

**App Won't Start After Installation**
```
Solution:
1. Check Windows version (need 10+)
2. Install Visual C++ Redistributable
3. Update graphics drivers
4. Run Windows Update
```

#### macOS Issues

**"App can't be opened because it is from an unidentified developer"**
```
Solution:
1. Go to System Preferences > Security & Privacy
2. Click "Open Anyway" next to the blocked message
3. Or right-click app > Open > Open
```

**App Quits Unexpectedly**
```
Solution:
1. Check macOS version (need 10.14+)
2. Update macOS to latest version
3. Check available disk space
4. Reset app permissions
```

**Gatekeeper Blocks Installation**
```
Solution:
1. System Preferences > Security & Privacy
2. Click "Allow apps downloaded from: Anywhere"
3. Or use: sudo spctl --master-disable
```

#### Linux Issues

**Permission Denied Error**
```bash
# Make executable
chmod +x DocAiProduction-*.AppImage

# Or run with sudo (not recommended)
sudo ./DocAiProduction-*.AppImage
```

**Missing Dependencies**
```bash
# Ubuntu/Debian
sudo apt-get install libnss3 libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2

# Fedora/RHEL
sudo dnf install nss atk at-spi2-atk libdrm libXcomposite libXdamage libXrandr mesa-libgbm libXScrnSaver alsa-lib
```

**AppImage Won't Run**
```bash
# Check if FUSE is installed
sudo apt-get install fuse

# Or use --appimage-extract-and-run
./DocAiProduction-*.AppImage --appimage-extract-and-run
```

### Update Issues

**Updates Not Downloading**
```
Check:
1. Internet connection
2. Firewall settings
3. Proxy configuration
4. GitHub access
```

**Update Installation Fails**
```
Try:
1. Close app completely
2. Run as administrator
3. Check disk space
4. Manual download from GitHub
```

### Performance Issues

**App Runs Slowly**
```
Optimize:
1. Close other applications
2. Update graphics drivers
3. Increase RAM if possible
4. Check for system updates
```

**High Memory Usage**
```
Monitor:
1. Use Task Manager (Windows) or Activity Monitor (macOS)
2. Check for memory leaks
3. Restart application periodically
4. Report to GitHub if persistent
```

## 🗑️ Uninstallation

### Windows Uninstallation

#### Using Control Panel
1. Go to **Settings** > **Apps**
2. Find **DocAiProduction**
3. Click **Uninstall**
4. Follow the uninstaller

#### Using Command Line
```powershell
# Find installation path
Get-WmiObject -Class Win32_Product | Where-Object {$_.Name -eq "DocAiProduction"}

# Uninstall
wmic product where name="DocAiProduction" call uninstall
```

### macOS Uninstallation

#### Using Finder
1. Open **Applications** folder
2. Drag **DocAiProduction** to **Trash**
3. Empty **Trash**
4. Remove preferences:
   ```bash
   rm -rf ~/Library/Preferences/com.hsnnrn.docaiproduction.plist
   rm -rf ~/Library/Application\ Support/DocAiProduction
   ```

### Linux Uninstallation

#### AppImage
```bash
# Simply delete the file
rm DocAiProduction-*.AppImage
```

#### Debian Package
```bash
# Uninstall package
sudo dpkg -r docaiproduction

# Remove configuration files
sudo dpkg --purge docaiproduction
```

#### Manual Cleanup
```bash
# Remove user data
rm -rf ~/.config/DocAiProduction
rm -rf ~/.cache/DocAiProduction
```

## 📞 Getting Help

### Before Asking for Help

1. **Check** this troubleshooting guide
2. **Search** [GitHub Issues](https://github.com/hsnnrn/DocAiProduction/issues)
3. **Update** to the latest version
4. **Restart** your computer

### Reporting Issues

When reporting issues, include:

1. **Operating System** and version
2. **DocAiProduction version**
3. **Steps to reproduce** the issue
4. **Error messages** (if any)
5. **System specifications**

### Contact Information

- **GitHub Issues**: [Report bugs](https://github.com/hsnnrn/DocAiProduction/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/hsnnrn/DocAiProduction/discussions)
- **Releases**: [Download updates](https://github.com/hsnnrn/DocAiProduction/releases)

---

**Need more help?** Check the [main README](README.md) or [create an issue](https://github.com/hsnnrn/DocAiProduction/issues/new) on GitHub.
