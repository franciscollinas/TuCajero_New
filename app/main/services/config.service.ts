import { prisma } from '../repositories/prisma';
import { ErrorCode, AppError } from '../utils/errors';
import { AuditService } from './audit.service';

const auditService = new AuditService();

export interface BusinessConfig {
  businessName: string;
  address: string;
  email: string;
  phone: string;
  nit: string;
  logo: string; // base64 data URL
  ivaRate: number; // IVA rate as decimal (e.g., 0.19 for 19%)
}

const CONFIG_KEYS: (keyof BusinessConfig)[] = [
  'businessName',
  'address',
  'email',
  'phone',
  'nit',
  'logo',
  'ivaRate',
];

export class ConfigService {
  async getConfig(): Promise<BusinessConfig> {
    const configs = await prisma.config.findMany({
      where: { key: { in: CONFIG_KEYS } },
    });

    const map: Record<string, string> = {};
    for (const c of configs) {
      map[c.key] = c.value;
    }

    return {
      businessName: map.businessName ?? '',
      address: map.address ?? '',
      email: map.email ?? '',
      phone: map.phone ?? '',
      nit: map.nit ?? '',
      logo: map.logo ?? '',
      ivaRate: map.ivaRate ? Number(map.ivaRate) : 0.19,
    };
  }

  async getIvaRate(): Promise<number> {
    const config = await prisma.config.findUnique({
      where: { key: 'ivaRate' },
    });
    return config ? Number(config.value) : 0.19;
  }

  async updateConfig(userId: number, data: Partial<BusinessConfig>): Promise<BusinessConfig> {
    const existing = await this.getConfig();

    const entries = Object.entries(data).filter(
      ([key]) => CONFIG_KEYS.includes(key as keyof BusinessConfig),
    );

    if (entries.length === 0) {
      throw new AppError(ErrorCode.VALIDATION, 'No hay datos válidos para actualizar.');
    }

    if (data.logo && data.logo.length > 2 * 1024 * 1024) {
      throw new AppError(ErrorCode.VALIDATION, 'El logo no debe superar los 2MB.');
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new AppError(ErrorCode.VALIDATION, 'El email no es válido.');
    }

    const now = new Date();

    for (const [key, value] of entries) {
      await prisma.config.upsert({
        where: { key },
        create: { key, value: String(value), updatedAt: now },
        update: { value: String(value), updatedAt: now },
      });
    }

    await auditService.log({
      userId,
      action: 'config:updated',
      entity: 'Config',
      payload: JSON.stringify({ before: existing, after: { ...existing, ...data } }),
    });

    return this.getConfig();
  }
}
