import { ipcMain } from 'electron';

import type { ApiResponse } from '../../renderer/src/shared/types/api.types';
import type { LicenseData, LicenseInfo } from '../../renderer/src/shared/types/license.types';
import { LicenseService } from '../services/license.service';
import { toApiError } from '../utils/errors';

const licenseService = new LicenseService();

export function registerLicenseIpc(): void {
  ipcMain.handle(
    'license:validate',
    async (): Promise<ApiResponse<LicenseInfo['validation']>> => {
      try {
        const result = await licenseService.validateCurrentLicense();
        return { success: true, data: result as LicenseInfo['validation'] };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'license:info',
    async (): Promise<ApiResponse<Awaited<ReturnType<typeof licenseService.getLicenseInfo>>>> => {
      try {
        const result = await licenseService.getLicenseInfo();
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'license:activate',
    async (_event, actorUserId: number, licenseString: string): Promise<ApiResponse<{ valid: boolean; message: string }>> => {
      try {
        const result = await licenseService.activateLicense(actorUserId, licenseString);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );

  ipcMain.handle(
    'license:generate',
    async (_event, actorUserId: number, months: number): Promise<ApiResponse<LicenseData>> => {
      try {
        const result = await licenseService.generateLicense(actorUserId, months);
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: toApiError(err) };
      }
    },
  );
}
