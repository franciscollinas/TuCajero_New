# TuCajero Build Resources

Esta carpeta contiene los recursos necesarios para construir el instalador profesional de TuCajero.

## Archivos

- `icon.ico` - Icono de la aplicación (256x256 mínimo recomendado)
- `license.txt` - Licencia de uso del software
- `installer.nsh` - Script NSIS para personalizar el instalador

## Cómo generar el icono

Si no tienes un icono, puedes crearlo con:

1. **Online:** https://convertio.co/png-ico/
2. **Desde PNG:** `magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico`
3. **Recomendado:** 256x256 PNG convertido a ICO

## Personalización

### Cambiar mensajes del instalador
Edita `installer.nsh` y modifica las secciones `!macro`.

### Agregar verificación de requisitos
En `installer.nsh`, dentro de `!macro customInit`, agrega:

```nsis
; Verificar espacio en disco (500MB mínimo)
System::Call 'kernel32::GetDiskFreeSpaceEx(t "$INSTDIR", *l.r0, *l.r1, *l.r2)'
Int64Cmp $0 524288000 <0 espacio_ok
  MessageBox MB_OK|MB_ICONSTOP "Se requieren al menos 500MB de espacio libre."
  Abort
espacio_ok:
```

### Firmar el instalador
Descomenta las líneas de firma de código en `electron-builder.config.js` y coloca tu certificado `.pfx` en esta carpeta.
