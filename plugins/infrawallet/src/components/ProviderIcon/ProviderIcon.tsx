import { default as React, memo, useEffect, useState } from 'react';
import { IconType } from 'react-icons';

enum IconLibrary {
  SimpleIcons = 'si',
  VSCodeCodicons = 'vsc',
}

const IconLibraryImportMap = {
  [IconLibrary.SimpleIcons]: () => import('react-icons/si'),
  [IconLibrary.VSCodeCodicons]: () => import('react-icons/vsc'),
};

// Icon registry to cache loaded icons
class IconRegistry {
  private static instance: IconRegistry;
  private iconCache: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): IconRegistry {
    if (!IconRegistry.instance) {
      IconRegistry.instance = new IconRegistry();
    }
    return IconRegistry.instance;
  }

  async loadIcon(library: IconLibrary, iconName: string): Promise<IconType | null> {
    const cacheKey = `${library}/${iconName}`;

    if (this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey);
    }

    try {
      const importFn = IconLibraryImportMap[library];
      if (!importFn) {
        throw new Error(`Unsupported icon library: ${library}`);
      }

      const module = await importFn();
      const icon = module[iconName as keyof typeof module];

      if (typeof icon === 'function') {
        this.iconCache.set(cacheKey, icon as IconType);
        return icon as IconType;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

type IconConfig = {
  icon: string;
  library: IconLibrary;
  color: string;
};

type ProviderIconProps = {
  provider: string | undefined;
  size?: number;
};

const iconConfigs: Record<string, IconConfig> = {
  aws: {
    icon: 'SiAmazonwebservices',
    library: IconLibrary.SimpleIcons,
    color: '#FF9900',
  },
  azure: {
    icon: 'VscAzure',
    library: IconLibrary.VSCodeCodicons,
    color: '#0078D4',
  },
  gcp: {
    icon: 'SiGooglecloud',
    library: IconLibrary.SimpleIcons,
    color: '#4285F4',
  },
  mongoatlas: {
    icon: 'SiMongodb',
    library: IconLibrary.SimpleIcons,
    color: '#47A248',
  },
  github: {
    icon: 'SiGithub',
    library: IconLibrary.SimpleIcons,
    color: '#181717',
  },
  datadog: {
    icon: 'SiDatadog',
    library: IconLibrary.SimpleIcons,
    color: '#632CA6',
  },
  grafana: {
    icon: 'SiGrafana',
    library: IconLibrary.SimpleIcons,
    color: '#F46800',
  },
};

export const ProviderIcon = memo(({ provider, size = 24 }: ProviderIconProps) => {
  const [IconComponent, setIconComponent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!provider) {
      return;
    }

    const config = iconConfigs[provider.toLowerCase()];

    if (!config) {
      return;
    }

    const loadIcon = async () => {
      setError(null);

      try {
        const registry = IconRegistry.getInstance();
        const icon = await registry.loadIcon(config.library, config.icon);

        if (icon) {
          setIconComponent(() => icon);
        } else {
          setError(`Icon ${config.icon} not found`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load icon');
      }
    };

    loadIcon();
  }, [provider]);

  if (!provider || error || !IconComponent) {
    return <></>;
  }

  const config = iconConfigs[provider.toLowerCase()];

  return <IconComponent size={size} color={config.color} />;
});
