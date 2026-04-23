const { createHmac } = require('crypto');

// ¡IMPORTANTE! Esta clave debe ser EXACTAMENTE la misma que está en app/main/utils/fingerprint.ts
const LICENSE_SECRET = process.env.LICENSE_SECRET ?? 'TuCajero-Licence-2026-PrivateKey';

function generateRemoteLicense(fingerprint, months) {
  if (!fingerprint) {
    console.error('❌ Error: Debes proveer el ID de Hardware (Fingerprint) del cliente.');
    console.log('Uso: node keygen.cjs <FINGERPRINT> <MESES>');
    process.exit(1);
  }

  const duration = parseInt(months, 10);
  if (isNaN(duration) || duration <= 0) {
    console.error('❌ Error: El número de meses debe ser un número válido mayor a 0.');
    console.log('Uso: node keygen.cjs <FINGERPRINT> <MESES>');
    process.exit(1);
  }

  // Calcular fecha de expiración
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + duration);
  const expiryIso = expiryDate.toISOString();

  // Firmar la licencia usando el secreto y SHA256 (Mismo método que el backend)
  const payload = `${fingerprint}|${expiryIso}`;
  const signature = createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex');

  const licenseData = {
    fingerprint,
    expiryDate: expiryIso,
    signature,
  };

  console.log('\n======================================================');
  console.log('✅ LICENCIA GENERADA EXITOSAMENTE');
  console.log('======================================================');
  console.log(`🔑 ID de Cliente : ${fingerprint}`);
  console.log(`📅 Válida hasta  : ${expiryDate.toLocaleDateString('es-CO')} (${duration} meses)`);
  console.log('======================================================');
  console.log('Copia el siguiente texto y envíaselo al cliente:\n');
  console.log(JSON.stringify(licenseData));
  console.log('\n======================================================\n');
}

// Obtener argumentos de la consola
const args = process.argv.slice(2);
const customerFingerprint = args[0];
const monthsDuration = args[1] || '12'; // Por defecto 12 meses (1 año)

generateRemoteLicense(customerFingerprint, monthsDuration);
