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
    MessageBox MB_OK|MB_ICONEXCLAMATION "TuCajero está en ejecución. Por favor, ciérrelo antes de continuar."
    Abort
  continue_install:
!macroend

!macro customInstall
  ; Create database directory
  CreateDirectory "$INSTDIR\database"
  
  ; Create config directory
  CreateDirectory "$INSTDIR\config"
  
  ; Create logs directory
  CreateDirectory "$INSTDIR\logs"
  
  ; Set environment file
  IfFileExists "$INSTDIR\.env" env_exists create_env
    create_env:
    FileOpen $0 "$INSTDIR\.env" w
    FileWrite $0 "DATABASE_URL=file:$INSTDIR\resources\app\database\tucajero.db$\r$\n"
    FileClose $0
  env_exists:
!macroend

!macro customUnInstall
  ; Ask if user wants to delete database
  MessageBox MB_YESNO|MB_ICONQUESTION "¿Desea conservar la base de datos y configuraciones?" IDNO delete_data
    ; Keep data
    Goto end_uninstall
  delete_data:
    RMDir /r "$INSTDIR\database"
    RMDir /r "$INSTDIR\config"
    RMDir /r "$INSTDIR\logs"
  end_uninstall:
!macroend

!macro customUnPageShow
  ; Custom uninstall page message
  MessageBox MB_OK|MB_ICONINFORMATION "Gracias por usar TuCajero. Si tiene alguna duda, contacte a soporte."
!macroend
