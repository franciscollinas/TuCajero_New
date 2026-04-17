import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getLicenseInfo } from '../api/license.api';
import type { LicenseInfo } from '../types/license.types';

interface LicenseContextType {
  licenseInfo: LicenseInfo | null;
  isLoading: boolean;
  isValid: boolean;
  isTrial: boolean;
  isBlocked: boolean;
  refresh: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: ReactNode }): JSX.Element {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async (): Promise<void> => {
    const response = await getLicenseInfo();
    if (response.success) {
      setLicenseInfo(response.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void refresh();

    // Refresh every minute to update trial countdown
    const interval = setInterval((): void => {
      void refresh();
    }, 60000);

    return (): void => clearInterval(interval);
  }, []);

  const isValid = licenseInfo?.validation.valid ?? false;
  const isBlocked = licenseInfo?.validation.trialBlocked ?? false;
  const isTrial = !isValid && !isBlocked;

  return (
    <LicenseContext.Provider
      value={{
        licenseInfo,
        isLoading,
        isValid,
        isTrial,
        isBlocked,
        refresh,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense(): LicenseContextType {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense debe usarse dentro de LicenseProvider');
  }
  return context;
}
