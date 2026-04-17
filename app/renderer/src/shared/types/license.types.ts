export interface LicenseData {
  fingerprint: string;
  expiryDate: string;
  signature: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  hasLicense: boolean;
  reason?: string;
  expiryDate?: Date;
  daysRemaining?: number;
  fingerprint: string;
  // Trial Fields
  trialBlocked?: boolean;
  trialRemainingHours?: number;
  trialRemainingMinutes?: number;
  trialRemainingSeconds?: number;
  firstRunDate?: string;
}

export interface LicenseInfo {
  fingerprint: {
    cpuInfo: string;
    diskSerial: string;
    macAddress: string;
    hostname: string;
    fingerprint: string;
  };
  currentLicense: LicenseData | null;
  validation: LicenseValidationResult;
}
