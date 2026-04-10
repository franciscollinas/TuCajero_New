const si = require('systeminformation');
const fs = require('fs');
const path = require('path');
const { createHash, createHmac } = require('crypto');

const LICENSE_SECRET = 'TuCajero-Licence-2026-PrivateKey';

async function getCPUInfo() {
  const cpu = await si.cpu();
  return `${cpu.manufacturer}|${cpu.brand}|${cpu.cores}`;
}

async function getDiskSerial() {
  const disks = await si.diskLayout();
  return disks.length > 0 ? disks[0].serialNum : '';
}

async function getMACAddress() {
  const interfaces = await si.networkInterfaces();
  const active = interfaces.find(
    (iface) => iface.operstate === 'up' && iface.mac !== '00:00:00:00:00:00' && !iface.internal,
  );
  return active?.mac ?? interfaces[0]?.mac ?? '';
}

function getHostname() {
  return process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? 'unknown';
}

async function generateFingerprint() {
  const [cpuInfo, diskSerial, macAddress] = await Promise.all([
    getCPUInfo(),
    getDiskSerial(),
    getMACAddress(),
  ]);
  const hostname = getHostname();
  const raw = `${cpuInfo}|${diskSerial}|${macAddress}|${hostname}`;
  const fingerprint = createHash('sha256').update(raw).digest('hex');
  return { cpuInfo, diskSerial, macAddress, hostname, fingerprint };
}

function generateLicense(fingerprint, expiryDate) {
  const payload = `${fingerprint}|${expiryDate.toISOString()}`;
  const signature = createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex');
  return { fingerprint, expiryDate: expiryDate.toISOString(), signature };
}

function validateLicense(license, currentFingerprint) {
  if (license.fingerprint !== currentFingerprint) {
    return { valid: false, reason: 'El fingerprint no coincide.' };
  }
  const expectedSignature = createHmac('sha256', LICENSE_SECRET)
    .update(`${license.fingerprint}|${license.expiryDate}`)
    .digest('hex');
  if (license.signature !== expectedSignature) {
    return { valid: false, reason: 'La firma de licencia no es válida.' };
  }
  const expiryDate = new Date(license.expiryDate);
  const now = new Date();
  const daysRemaining = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (now.getTime() > expiryDate.getTime()) {
    return { valid: false, reason: `La licencia expiró.`, daysRemaining: 0 };
  }
  return { valid: true, daysRemaining };
}

function printLicense(license) {
  console.log('\n' + '='.repeat(50));
  console.log('LICENCIA GENERADA');
  console.log('='.repeat(50));
  console.log(JSON.stringify(license, null, 2));
  console.log('='.repeat(50) + '\n');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n📋 Generador de Licencias TuCajero');
    console.log('─'.repeat(40));
    console.log('\nOpciones:');
    console.log('  node licencia-generador.js mi            - Mi fingerprint');
    console.log('  node licencia-generador.js gen <fingerprint> <meses>  - Generar licencia');
    console.log('  node licencia-generador.js val <archivo>    - Validar licencia');
    console.log('\nEjemplos:');
    console.log('  node licencia-generador.js mi');
    console.log('  node licencia-generador.js gen ABCD1234... 12');
    console.log('  node licencia-generador.js val licencia.json\n');
    return;
  }

  const command = args[0];

  if (command === 'mi') {
    console.log('\n🔍 Generando fingerprint de este equipo...\n');
    const fp = await generateFingerprint();
    console.log('Fingerprint: ' + fp.fingerprint);
    console.log('\nDetalles:');
    console.log('  CPU: ' + fp.cpuInfo);
    console.log('  Disco: ' + fp.diskSerial);
    console.log('  MAC: ' + fp.macAddress);
    console.log('  Hostname: ' + fp.hostname);
    console.log('');
    return;
  }

  if (command === 'gen') {
    if (args.length < 3) {
      console.log('\n❌ Uso: node licencia-generador.js gen <fingerprint> <meses>\n');
      return;
    }
    const fingerprint = args[1];
    const meses = parseInt(args[2], 10);
    if (isNaN(meses) || meses < 1 || meses > 60) {
      console.log('\n❌ Meses debe ser entre 1 y 60\n');
      return;
    }
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + meses);
    const license = generateLicense(fingerprint, expiryDate);
    printLicense(license);
    const outFile = path.join(__dirname, `licencia-${fingerprint.slice(0, 8)}.json`);
    fs.writeFileSync(outFile, JSON.stringify(license, null, 2));
    console.log('💾 Guardado en: ' + outFile);
    console.log('');
    return;
  }

  if (command === 'val') {
    if (args.length < 2) {
      console.log('\n❌ Uso: node licencia-generador.js val <archivo>\n');
      return;
    }
    const file = args[1];
    if (!fs.existsSync(file)) {
      console.log('\n❌ Archivo no encontrado\n');
      return;
    }
    const license = JSON.parse(fs.readFileSync(file, 'utf8'));
    const fp = await generateFingerprint();
    const result = validateLicense(license, fp.fingerprint);
    const expiryDate = new Date(license.expiryDate);
    console.log('\n📋 Validación de licencia');
    console.log('─'.repeat(30));
    console.log('Archivo: ' + file);
    console.log('Fingerprint license: ' + license.fingerprint.slice(0, 16) + '...');
    console.log('Fingerprint actual: ' + fp.fingerprint.slice(0, 16) + '...');
    console.log('Expira: ' + expiryDate.toLocaleDateString('es-CO'));
    console.log('Días restantes: ' + result.daysRemaining);
    console.log('Válida: ' + (result.valid ? '✅ Sí' : '❌ No'));
    if (result.reason) console.log('Razón: ' + result.reason);
    console.log('');
    return;
  }

  console.log('\n❌ Comando desconocido\n');
}

main().catch(console.error);
