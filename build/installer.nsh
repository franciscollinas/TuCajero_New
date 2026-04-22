; NSIS Installer Script for TuCajero
; This script customizes the installation experience

!macro preInit
  ; Set custom installer window size
  !insertmacro MUI_HEADER_TEXT "TuCajero POS" "Sistema Punto de Venta para Farmacias"
!macroend

!macro customInit
  ; Check minimum system requirements
  ; Minimum 2GB RAM recommended
  ; Minimum 500MB disk space

  ; Check if TuCajero is already running
  FindWindow $0 "TuCajero POS" ""
  IntCmp $0 0 continue_install
    MessageBox MB_OK|MB_ICONEXCLAMATION "TuCajero esta en ejecucion. Por favor, cierrelo antes de continuar."
    Abort
  continue_install:
!macroend

!macro customInstall
  ; Runtime data now lives under Electron userData (AppData), not inside Program Files.
  ; Do not create mutable data folders under $INSTDIR or override DATABASE_URL here.
!macroend

!macro customUnInstall
  ; Runtime data is stored outside $INSTDIR, so uninstall should not remove user data here.
!macroend

!macro customUnPageShow
  ; Custom uninstall page message
  MessageBox MB_OK|MB_ICONINFORMATION "Gracias por usar TuCajero. Si tiene alguna duda, contacte a soporte."
!macroend
