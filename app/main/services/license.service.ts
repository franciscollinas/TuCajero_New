import { app } from 'electron';
import fs from 'fs';
import path from 'path';

import { prisma } from '../repositories/prisma';
import { AppError, ErrorCode } from '../utils/errors';
import {
  generateFingerprint,
  generateLicense,
  validateLicense,
  type HardwareFingerprint,
  type LicenseData,
  type LicenseValidation,
} from '../utils/fingerprint';
import { AuditService } from './audit.service';

const LICENSE_FILE = 'license.dat';

const auditService = new AuditService();

function getLicensePath(): string {
  return path.join(app.getPath('userData'), LICENSE_FILE);
}

function saveLicenseToFile(license: LicenseData): void {
  const filePath = getLicensePath();
  fs.writeFileSync(filePath, JSON.stringify(license, null, 2), 'utf8');
}

function loadLicenseFromFile(): LicenseData | null {
  const filePath = getLicensePath();
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as LicenseData;
  } catch {
    return null;
  }
}

export class LicenseService {
  async getFingerprint(): Promise<HardwareFingerprint> {
    return generateFingerprint();
  }

  async generateLicense(adminUserId: number, months: number): Promise<LicenseData> {
    const actor = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { active: true, role: true },
    });

    if (!actor || !actor.active || actor.role !== 'ADMIN') {
      throw new AppError(ErrorCode.FORBIDDEN, 'Solo los administradores pueden generar licencias.');
    }

    const fingerprint = await generateFingerprint();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + months);

    const license = generateLicense(fingerprint.fingerprint, expiryDate);
    saveLicenseToFile(license);

    await auditService.log({
      userId: adminUserId,
      action: 'license:generated',
      entity: 'License',
      payload: {
        fingerprint: fingerprint.fingerprint,
        expiryDate: expiryDate.toISOString(),
        months,
      },
    });

    return license;
  }

  async activateLicense(adminUserId: number, licenseString: string): Promise<{ valid: boolean; message: string }> {
    const actor = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { active: true, role: true },
    });

    if (!actor || !actor.active || actor.role !== 'ADMIN') {
      throw new AppError(ErrorCode.FORBIDDEN, 'Solo los administradores pueden activar licencias.');
    }

    let license: LicenseData;
    try {
      license = JSON.parse(licenseString) as LicenseData;
    } catch {
      throw new AppError(ErrorCode.VALIDATION, 'El formato de la licencia no es válido.');
    }

    const fingerprint = await generateFingerprint();
    const validation = validateLicense(license, fingerprint.fingerprint);

    if (!validation.valid) {
      return { valid: false, message: validation.reason ?? 'Licencia inválida.' };
    }

    saveLicenseToFile(license);

    await auditService.log({
      userId: adminUserId,
      action: 'license:activated',
      entity: 'License',
      payload: {
        fingerprint: fingerprint.fingerprint,
        expiryDate: license.expiryDate,
      },
    });

    return { valid: true, message: 'Licencia activada correctamente.' };
  }

  async validateCurrentLicense(): Promise<LicenseValidation & { hasLicense: boolean; fingerprint: string }> {
    const fingerprint = await generateFingerprint();
    const license = loadLicenseFromFile();

    if (!license) {
      return { valid: false, hasLicense: false, fingerprint: fingerprint.fingerprint, reason: 'No hay licencia instalada.' };
    }

    const validation = validateLicense(license, fingerprint.fingerprint);

    return {
      ...validation,
      hasLicense: true,
      fingerprint: fingerprint.fingerprint,
    };
  }

  async getLicenseInfo(): Promise<{
    fingerprint: HardwareFingerprint;
    currentLicense: LicenseData | null;
    validation: LicenseValidation & { hasLicense: boolean };
  }> {
    const fingerprint = await generateFingerprint();
    const currentLicense = loadLicenseFromFile();
    const validation = currentLicense
      ? validateLicense(currentLicense, fingerprint.fingerprint)
      : { valid: false, hasLicense: false, reason: 'No hay licencia instalada.' };

    return {
      fingerprint,
      currentLicense,
      validation: {
        ...validation,
        hasLicense: !!currentLicense,
      },
    };
  }
}
