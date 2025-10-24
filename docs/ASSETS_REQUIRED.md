# Required Assets for DocDataApp

This document lists all the required assets for building and distributing DocDataApp.

## 🎨 Icon Files

### Required Icon Formats

| Platform | Format | Size | File Path | Description |
|----------|--------|------|-----------|-------------|
| Windows | `.ico` | 256x256 | `assets/icon.ico` | Windows application icon |
| macOS | `.icns` | 512x512 | `assets/icon.icns` | macOS application icon |
| Linux | `.png` | 512x512 | `assets/icon.png` | Linux application icon |

### Icon Creation Guide

1. **Create a high-resolution icon** (1024x1024 PNG)
2. **Use a design tool** like:
   - Adobe Illustrator
   - Figma
   - GIMP (free)
   - Canva (online)

3. **Convert to required formats**:

#### Windows ICO
```bash
# Using ImageMagick
convert icon-1024.png -resize 256x256 assets/icon.ico

# Or use online converter
# https://convertio.co/png-ico/
```

#### macOS ICNS
```bash
# Create iconset directory
mkdir assets/icon.iconset

# Generate different sizes
sips -z 16 16     icon-1024.png --out assets/icon.iconset/icon_16x16.png
sips -z 32 32     icon-1024.png --out assets/icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-1024.png --out assets/icon.iconset/icon_32x32.png
sips -z 64 64     icon-1024.png --out assets/icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-1024.png --out assets/icon.iconset/icon_128x128.png
sips -z 256 256   icon-1024.png --out assets/icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-1024.png --out assets/icon.iconset/icon_256x256.png
sips -z 512 512   icon-1024.png --out assets/icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-1024.png --out assets/icon.iconset/icon_512x512.png
sips -z 1024 1024 icon-1024.png --out assets/icon.iconset/icon_512x512@2x.png

# Create ICNS file
iconutil -c icns assets/icon.iconset -o assets/icon.icns
```

#### Linux PNG
```bash
# Simply copy the 512x512 version
cp icon-1024.png assets/icon.png
```

## 🖼️ Installer Assets

### Windows NSIS Assets

| File | Size | Description |
|------|------|-------------|
| `assets/header.bmp` | 150x57 | Header image for installer |
| `assets/wizard.bmp` | 164x314 | Side image for installer |
| `assets/installer.nsh` | - | Custom NSIS script |

### macOS DMG Assets

| File | Size | Description |
|------|------|-------------|
| `assets/dmg-background.png` | 640x400 | DMG background image |
| `assets/entitlements.mac.plist` | - | macOS entitlements file |

### Linux Assets

| File | Size | Description |
|------|------|-------------|
| `assets/icon.png` | 512x512 | Application icon |

## 📄 Documentation Assets

### Required Files

| File | Description |
|------|-------------|
| `LICENSE.txt` | Software license |
| `README.md` | Project readme |
| `CHANGELOG.md` | Version history |
| `docs/INSTALLATION.md` | Installation guide |
| `docs/TROUBLESHOOTING.md` | Troubleshooting guide |
| `docs/GITHUB_SECRETS_SETUP.md` | GitHub secrets setup |

## 🔧 Build Assets

### Scripts

| File | Description |
|------|-------------|
| `scripts/notarize.js` | macOS notarization script |
| `scripts/after-build.js` | Post-build processing script |

### Configuration Files

| File | Description |
|------|-------------|
| `electron-builder.yml` | Electron Builder configuration |
| `.github/workflows/build.yml` | GitHub Actions build workflow |
| `.github/workflows/release.yml` | GitHub Actions release workflow |

## 🎨 Design Guidelines

### Icon Design

1. **Use a simple, recognizable design**
2. **Ensure it looks good at small sizes** (16x16)
3. **Use consistent colors** with your brand
4. **Avoid text** in the icon
5. **Test on different backgrounds**

### Color Scheme

- **Primary**: #3B82F6 (Blue)
- **Secondary**: #10B981 (Green)
- **Accent**: #F59E0B (Amber)
- **Background**: #FFFFFF (White)
- **Text**: #1F2937 (Dark Gray)

### Typography

- **Headings**: Inter, system-ui, sans-serif
- **Body**: Inter, system-ui, sans-serif
- **Code**: JetBrains Mono, Consolas, monospace

## 📦 Asset Checklist

Before building, ensure you have:

- [ ] `assets/icon.ico` (Windows)
- [ ] `assets/icon.icns` (macOS)
- [ ] `assets/icon.png` (Linux)
- [ ] `assets/header.bmp` (Windows installer)
- [ ] `assets/wizard.bmp` (Windows installer)
- [ ] `assets/dmg-background.png` (macOS DMG)
- [ ] `assets/entitlements.mac.plist` (macOS)
- [ ] `assets/installer.nsh` (Windows)
- [ ] `LICENSE.txt`
- [ ] All documentation files

## 🛠️ Asset Generation Tools

### Online Tools

- [Favicon Generator](https://realfavicongenerator.net/)
- [Icon Converter](https://convertio.co/)
- [ICO Converter](https://icoconvert.com/)

### Desktop Tools

- **macOS**: Preview, Icon Composer
- **Windows**: Paint.NET, GIMP
- **Linux**: GIMP, Inkscape

### Command Line Tools

- **ImageMagick**: Image processing
- **sips**: macOS image processing
- **iconutil**: macOS icon creation

## 📋 Asset Validation

### Before Release

1. **Test all icons** in the application
2. **Verify installer images** display correctly
3. **Check file sizes** are reasonable
4. **Validate file formats** are correct
5. **Test on target platforms**

### Quality Checklist

- [ ] Icons are crisp at all sizes
- [ ] Installer images are professional
- [ ] All assets are optimized
- [ ] File formats are correct
- [ ] No broken links or missing files

---

**Note**: All assets should be optimized for file size while maintaining quality. Use tools like TinyPNG for compression.
