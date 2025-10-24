# Troubleshooting Guide

## 🚨 Common Issues

### Application Won't Start

#### Windows
**Problem**: Application crashes on startup
**Solutions**:
1. **Check Windows Version**
   ```cmd
   winver
   ```
   Ensure you're running Windows 10 version 1903 or later

2. **Run as Administrator**
   - Right-click on DocDataApp
   - Select "Run as administrator"

3. **Check Antivirus**
   - Temporarily disable antivirus
   - Add DocDataApp to exceptions list

4. **Clear Cache**
   ```cmd
   # Delete cache directory
   rmdir /s "%APPDATA%\DocDataApp\cache"
   ```

#### macOS
**Problem**: "App can't be opened because it is from an unidentified developer"
**Solutions**:
1. **Bypass Gatekeeper**
   ```bash
   # Right-click on DocDataApp
   # Select "Open" from context menu
   # Click "Open" in the dialog
   ```

2. **Disable Gatekeeper Temporarily**
   ```bash
   sudo spctl --master-disable
   # Install app, then re-enable:
   sudo spctl --master-enable
   ```

3. **Check System Integrity**
   ```bash
   # Reset Gatekeeper
   sudo spctl --reset-default
   ```

#### Linux
**Problem**: AppImage won't execute
**Solutions**:
1. **Make Executable**
   ```bash
   chmod +x DocDataApp-*.AppImage
   ```

2. **Install FUSE**
   ```bash
   # Ubuntu/Debian
   sudo apt install fuse
   
   # CentOS/RHEL
   sudo yum install fuse
   ```

3. **Extract and Run**
   ```bash
   # Extract AppImage
   ./DocDataApp-*.AppImage --appimage-extract
   ./squashfs-root/DocDataApp
   ```

### Performance Issues

#### Slow Startup
**Solutions**:
1. **Disable Startup Programs**
   - Windows: Task Manager → Startup
   - macOS: System Preferences → Users & Groups → Login Items
   - Linux: Check autostart applications

2. **Clear Log Files**
   ```bash
   # Windows
   del "%APPDATA%\DocDataApp\logs\*.log"
   
   # macOS
   rm ~/Library/Application\ Support/DocDataApp/logs/*.log
   
   # Linux
   rm ~/.config/DocDataApp/logs/*.log
   ```

3. **Check System Resources**
   ```bash
   # Check available memory
   # Windows: Task Manager
   # macOS: Activity Monitor
   # Linux: htop or free -h
   ```

#### High Memory Usage
**Solutions**:
1. **Restart Application**
   - Close and reopen DocDataApp

2. **Reduce Document Cache**
   - Settings → Performance → Reduce cache size

3. **Close Other Applications**
   - Free up system memory

### File Access Issues

#### Cannot Open Documents
**Solutions**:
1. **Check File Permissions**
   ```bash
   # Windows: Right-click file → Properties → Security
   # macOS: Get Info → Sharing & Permissions
   # Linux: ls -la filename
   ```

2. **Run as Administrator**
   - Windows: Right-click → Run as administrator
   - macOS: Use sudo (not recommended)
   - Linux: Use sudo or fix permissions

3. **Check File Format**
   - Ensure file is supported format
   - Try converting to supported format

#### Documents Not Saving
**Solutions**:
1. **Check Disk Space**
   ```bash
   # Windows: Check C: drive space
   # macOS: About This Mac → Storage
   # Linux: df -h
   ```

2. **Check Write Permissions**
   - Ensure you have write access to save location

3. **Try Different Location**
   - Save to Desktop or Documents folder

### Network Issues

#### Cannot Connect to AI Services
**Solutions**:
1. **Check Internet Connection**
   ```bash
   # Test connectivity
   ping google.com
   ```

2. **Check Firewall**
   - Windows: Windows Defender Firewall
   - macOS: System Preferences → Security & Privacy → Firewall
   - Linux: ufw or iptables

3. **Check Proxy Settings**
   - Settings → Network → Proxy configuration

4. **Disable VPN**
   - Temporarily disable VPN if active

#### Update Failures
**Solutions**:
1. **Check Internet Connection**
   - Ensure stable internet connection

2. **Clear Update Cache**
   ```bash
   # Windows
   del "%APPDATA%\DocDataApp\updates\*"
   
   # macOS
   rm ~/Library/Application\ Support/DocDataApp/updates/*
   
   # Linux
   rm ~/.config/DocDataApp/updates/*
   ```

3. **Manual Update**
   - Download latest version from GitHub releases

### UI/Display Issues

#### Interface Not Loading
**Solutions**:
1. **Hard Refresh**
   - Windows: Ctrl + F5
   - macOS: Cmd + R
   - Linux: Ctrl + F5

2. **Clear Application Data**
   ```bash
   # Close application first
   # Delete data directory (see installation guide for paths)
   ```

3. **Check Graphics Drivers**
   - Update graphics drivers
   - Disable hardware acceleration in settings

#### Text Rendering Issues
**Solutions**:
1. **Check System Fonts**
   - Ensure system fonts are properly installed

2. **Adjust DPI Settings**
   - Windows: Display settings → Scale and layout
   - macOS: System Preferences → Displays
   - Linux: Display settings

3. **Disable Hardware Acceleration**
   - Settings → Advanced → Disable hardware acceleration

## 🔧 Advanced Troubleshooting

### Debug Mode
Enable debug mode for detailed logging:

1. **Windows**
   ```cmd
   # Set environment variable
   set DEBUG=true
   # Run application
   DocDataApp.exe
   ```

2. **macOS**
   ```bash
   # Set environment variable
   export DEBUG=true
   # Run application
   /Applications/DocDataApp.app/Contents/MacOS/DocDataApp
   ```

3. **Linux**
   ```bash
   # Set environment variable
   export DEBUG=true
   # Run application
   ./DocDataApp-*.AppImage
   ```

### Log Files
Check log files for detailed error information:

**Windows:**
```
%APPDATA%\DocDataApp\logs\
├── main.log
├── renderer.log
└── error.log
```

**macOS:**
```
~/Library/Application Support/DocDataApp/logs/
├── main.log
├── renderer.log
└── error.log
```

**Linux:**
```
~/.config/DocDataApp/logs/
├── main.log
├── renderer.log
└── error.log
```

### Reset Application
Complete reset of application data:

1. **Close Application**
   - Ensure DocDataApp is completely closed

2. **Delete Data Directory**
   ```bash
   # Windows
   rmdir /s "%APPDATA%\DocDataApp"
   
   # macOS
   rm -rf ~/Library/Application\ Support/DocDataApp
   
   # Linux
   rm -rf ~/.config/DocDataApp
   ```

3. **Restart Application**
   - Launch DocDataApp
   - Complete initial setup again

### System Requirements Check
Verify system meets minimum requirements:

**Windows:**
```cmd
# Check Windows version
winver

# Check architecture
echo %PROCESSOR_ARCHITECTURE%

# Check available memory
wmic computersystem get TotalPhysicalMemory
```

**macOS:**
```bash
# Check macOS version
sw_vers

# Check architecture
uname -m

# Check available memory
system_profiler SPHardwareDataType | grep Memory
```

**Linux:**
```bash
# Check distribution
cat /etc/os-release

# Check architecture
uname -m

# Check available memory
free -h
```

## 🆘 Getting Help

### Before Contacting Support

1. **Check This Guide**
   - Search for your specific issue
   - Try suggested solutions

2. **Check GitHub Issues**
   - Search existing issues
   - Check if problem is already reported

3. **Gather Information**
   - Application version
   - Operating system version
   - Error messages (screenshot or copy text)
   - Steps to reproduce the issue

### Contact Support

**GitHub Issues:**
- [Report Bug](https://github.com/turkishdeepkebab/Docdataapp/issues/new?template=bug_report.md)
- [Request Feature](https://github.com/turkishdeepkebab/Docdataapp/issues/new?template=feature_request.md)

**Email Support:**
- support@docdataapp.com
- Include system information and error logs

**Community Support:**
- [Discord Server](https://discord.gg/docdataapp)
- [Reddit Community](https://reddit.com/r/docdataapp)

### Providing Useful Information

When reporting issues, include:

1. **System Information**
   - Operating system and version
   - Application version
   - Hardware specifications

2. **Error Details**
   - Exact error message
   - When the error occurs
   - Steps to reproduce

3. **Log Files**
   - Attach relevant log files
   - Remove sensitive information

4. **Screenshots**
   - Visual representation of the issue
   - Error dialogs

---

**Note**: This troubleshooting guide is regularly updated. For the latest solutions, visit our [official documentation](https://docs.docdataapp.com).
