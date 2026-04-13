import { createHmac, createHash } from 'crypto';
import si from 'systeminformation';

// License signing key — set via env var in production; fallback for dev only
const LICENSE_SECRET = process.env.LICENSE_SECRET ?? 'TuCajero-Licence-2026-PrivateKey';

export interface HardwareFingerprint {
  cpuInfo: string;
  diskSerial: string;
  macAddress: string;
  hostname: string;
  fingerprint: string;
}

export interface LicenseData {
  fingerprint: string;
  expiryDate: string;
  signature: string;
}

export interface LicenseValidation {
  valid: boolean;
  reason?: string;
  expiryDate?: Date;
  daysRemaining?: number;
}

async function getCPUInfo(): Promise<string> {
  const cpu = await si.cpu();
  return `${cpu.manufacturer}|${cpu.brand}|${cpu.cores}`;
}

async function getDiskSerial(): Promise<string> {
  const disks = await si.diskLayout();
  return disks.length > 0 ? disks[0].serialNum : '';
}

async function getMACAddress(): Promise<string> {
  const interfaces = await si.networkInterfaces();
  const active = interfaces.find(
    (iface) => iface.operstate === 'up' && iface.mac !== '00:00:00:00:00:00' && !iface.internal,
  );
  return active?.mac ?? interfaces[0]?.mac ?? '';
}

function getHostname(): string {
  return process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? 'unknown';
}

export async function generateFingerprint(): Promise<HardwareFingerprint> {
  const [cpuInfo, diskSerial, macAddress] = await Promise.all([
    getCPUInfo(),
    getDiskSerial(),
    getMACAddress(),
  ]);

  const hostname = getHostname();

  const raw = `${cpuInfo}|${diskSerial}|${macAddress}|${hostname}`;
  const fingerprint = createHash('sha256').update(raw).digest('hex');

  return {
    cpuInfo,
    diskSerial,
    macAddress,
    hostname,
    fingerprint,
  };
}

export function generateLicense(fingerprint: string, expiryDate: Date): LicenseData {
  const payload = `${fingerprint}|${expiryDate.toISOString()}`;
  const signature = createHmac('sha256', LICENSE_SECRET).update(payload).digest('hex');

  return {
    fingerprint,
    expiryDate: expiryDate.toISOString(),
    signature,
  };
}

export function validateLicense(license: LicenseData, currentFingerprint: string): LicenseValidation {
  if (license.fingerprint !== currentFingerprint) {
    return { valid: false, reason: 'El fingerprint no coincide con este equipo.' };
  }

  const expectedSignature = createHmac('sha256', LICENSE_SECRET)
    .update(`${license.fingerprint}|${license.expiryDate}`)
    .digest('hex');

  if (license.signature !== expectedSignature) {
    return { valid: false, reason: 'La firma de la licencia no es válida.' };
  }

  const expiryDate = new Date(license.expiryDate);
  if (Number.isNaN(expiryDate.getTime())) {
    return { valid: false, reason: 'La fecha de expiración no es válida.' };
  }

  const now = new Date();
  const daysRemaining = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (now.getTime() > expiryDate.getTime()) {
    return { valid: false, reason: `La licencia expiró el ${expiryDate.toLocaleDateString('es-CO')}.`, expiryDate, daysRemaining };
  }

  return { valid: true, expiryDate, daysRemaining };
}

export function formatFingerprintShort(fingerprint: string): string {
  return `${fingerprint.slice(0, 8)}...${fingerprint.slice(-8)}`;
}
