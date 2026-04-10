# Generador de Licencias TuCajero

## Instalación

```bash
cd tools/license-generator
npm install
```

## Comandos

### Ver mi fingerprint

```bash
node licencia-generador.js mi
```

Muestra la fingerprint de este computador (para usar como referencia).

### Generar licencia para un cliente

```bash
node licencia-generador.js gen <FINGERPRINT> <MESES>
```

Ejemplo:

```bash
node licencia-generador.js gen a1b2c3d4e5f6... 12
```

Esto genera una licencia válida por 12 meses para la fingerprint específica.

### Validar licencia

```bash
node licencia-generador.js val <ARCHIVO>
```

Ejemplo:

```bash
node licencia-generador.js val licencia-a1b2c3.json
```

## Flujo de trabajo

1. **Cliente** instala TuCajero
2. **Cliente** te envía su fingerprint (puede copiarla pegando en WhatsApp)
3. **Tú** generas la licencia:
   ```bash
   node licencia-generador.js gen FINGERPRINT_DEL_CLIENTE 12
   ```
4. **Archivo** se guarda como `licencia-XXXXXXXX.json`
5. **Le envías** el archivo JSON al cliente
6. **Cliente** lo copia/pega en su input de licencia

## Notas

- La fingerprint debe ser la exacta del cliente (sin espacios extra)
- Meses puede ser 1-60
- El archivo JSON contiene la licencia firmado cryptográficamente
