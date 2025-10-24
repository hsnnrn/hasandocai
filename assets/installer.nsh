; NSIS Installer Script for DocDataApp
; This script provides custom installation behavior

!macro preInit
  ; Pre-installation tasks
  SetRegView 64
  WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
  WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
!macroend

!macro customInstall
  ; Custom installation tasks
  DetailPrint "Installing DocDataApp..."
  
  ; Create application data directory
  CreateDirectory "$APPDATA\DocDataApp"
  CreateDirectory "$APPDATA\DocDataApp\logs"
  CreateDirectory "$APPDATA\DocDataApp\cache"
  CreateDirectory "$APPDATA\DocDataApp\documents"
  
  ; Set permissions
  AccessControl::GrantOnFile "$APPDATA\DocDataApp" "(BU)" "FullAccess"
  
  ; Register file associations
  WriteRegStr HKCR ".docdata" "" "DocDataApp.Document"
  WriteRegStr HKCR "DocDataApp.Document" "" "DocDataApp Document"
  WriteRegStr HKCR "DocDataApp.Document\DefaultIcon" "" "$INSTDIR\DocDataApp.exe,0"
  WriteRegStr HKCR "DocDataApp.Document\shell\open\command" "" '"$INSTDIR\DocDataApp.exe" "%1"'
  
  ; Register uninstaller
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DocDataApp" "DisplayName" "DocDataApp"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DocDataApp" "UninstallString" "$INSTDIR\Uninstall DocDataApp.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DocDataApp" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DocDataApp" "Publisher" "DocDataApp Team"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DocDataApp" "DisplayVersion" "${VERSION}"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DocDataApp" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DocDataApp" "NoRepair" 1
  
  DetailPrint "DocDataApp installed successfully!"
!macroend

!macro customUnInstall
  ; Custom uninstallation tasks
  DetailPrint "Uninstalling DocDataApp..."
  
  ; Remove file associations
  DeleteRegKey HKCR ".docdata"
  DeleteRegKey HKCR "DocDataApp.Document"
  
  ; Remove registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\DocDataApp"
  
  ; Ask user about application data
  MessageBox MB_YESNO "Do you want to keep your documents and settings?" IDYES keep_data IDNO remove_data
  
  keep_data:
    DetailPrint "Keeping application data in $APPDATA\DocDataApp"
    Goto end_uninstall
  
  remove_data:
    DetailPrint "Removing application data..."
    RMDir /r "$APPDATA\DocDataApp"
    Goto end_uninstall
  
  end_uninstall:
    DetailPrint "DocDataApp uninstalled successfully!"
!macroend

!macro customHeader
  ; Custom header information
  !define PRODUCT_NAME "DocDataApp"
  !define PRODUCT_VERSION "${VERSION}"
  !define PRODUCT_PUBLISHER "DocDataApp Team"
  !define PRODUCT_WEB_SITE "https://github.com/turkishdeepkebab/Docdataapp"
  !define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\DocDataApp.exe"
  !define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\DocDataApp"
  !define PRODUCT_UNINST_ROOT_KEY "HKLM"
!macroend

!macro customWelcomePage
  ; Custom welcome page
  !insertmacro MUI_PAGE_WELCOME
  !insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
  !insertmacro MUI_PAGE_COMPONENTS
  !insertmacro MUI_PAGE_DIRECTORY
  !insertmacro MUI_PAGE_INSTFILES
  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customFinishPage
  ; Custom finish page
  !insertmacro MUI_UNPAGE_WELCOME
  !insertmacro MUI_UNPAGE_CONFIRM
  !insertmacro MUI_UNPAGE_INSTFILES
  !insertmacro MUI_UNPAGE_FINISH
!macroend

; Custom pages
!macro customInstallMode
  ; Installation mode selection
  !insertmacro MUI_PAGE_WELCOME
  !insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
  !insertmacro MUI_PAGE_COMPONENTS
  !insertmacro MUI_PAGE_DIRECTORY
  !insertmacro MUI_PAGE_INSTFILES
  !insertmacro MUI_PAGE_FINISH
!macroend

; Language files
!macro customLanguages
  !insertmacro MUI_LANGUAGE "English"
  !insertmacro MUI_LANGUAGE "Turkish"
!macroend

; Custom icons
!macro customIcons
  !define MUI_ICON "assets\icon.ico"
  !define MUI_UNICON "assets\icon.ico"
  !define MUI_HEADERIMAGE
  !define MUI_HEADERIMAGE_BITMAP "assets\header.bmp"
  !define MUI_HEADERIMAGE_UNBITMAP "assets\header.bmp"
  !define MUI_WELCOMEFINISHPAGE_BITMAP "assets\wizard.bmp"
  !define MUI_UNWELCOMEFINISHPAGE_BITMAP "assets\wizard.bmp"
!macroend
