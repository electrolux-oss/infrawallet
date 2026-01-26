import { colorList } from './constants';

export const getProviderColorIndex = (provider: string): number => {
  let hash = 0;
  for (let i = 0; i < provider.length; i++) {
    const char = provider.codePointAt(i) || 0;
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % colorList.length;
};

export const getProviderColor = (provider: string): string => {
  const colorIndex = getProviderColorIndex(provider);
  return colorList[colorIndex];
};
