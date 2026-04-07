import type { ApiResponse } from '../types/api.types';
import type { LicenseData, LicenseInfo, LicenseValidationResult } from '../types/license.types';

export function validateLicense(): Promise<ApiResponse<LicenseValidationResult>> {
  return window.api.invoke<LicenseValidationResult>('license:validate');
}

export function getLicenseInfo(): Promise<ApiResponse<LicenseInfo>> {
  return window.api.invoke<LicenseInfo>('license:info');
}

export function activateLicense(
  actorUserId: number,
  licenseString: string,
): Promise<ApiResponse<{ valid: boolean; message: string }>> {
  return window.api.invoke('license:activate', actorUserId, licenseString);
}

export function generateLicense(
  actorUserId: number,
  months: number,
): Promise<ApiResponse<LicenseData>> {
  return window.api.invoke<LicenseData>('license:generate', actorUserId, months);
}
