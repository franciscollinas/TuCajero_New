import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getConfig } from '../api/config.api';
import type { BusinessConfig } from '../types/config.types';

interface ConfigContextType {
  config: BusinessConfig | null;
  loaded: boolean;
  refresh: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loaded: false,
  refresh: async () => {},
});

export function ConfigProvider({ children }: { children: ReactNode }): JSX.Element {
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = async (): Promise<void> => {
    const response = await getConfig();
    if (response.success) {
      setConfig(response.data);
    }
    setLoaded(true);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loaded, refresh }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextType {
  return useContext(ConfigContext);
}
