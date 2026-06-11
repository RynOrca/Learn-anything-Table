import { create } from 'zustand';
import type { Settings } from '../types';

interface SettingsState extends Settings {
  setApiKey: (key: string) => void;
  setDataDir: (dir: string) => void;
  setFontSize: (size: number) => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

const STORAGE_KEY = 'learn-anything-settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  deepseekApiKey: '',
  dataDir: '../..',
  fontSize: 13,

  setApiKey: (key: string) => set({ deepseekApiKey: key }),
  setDataDir: (dir: string) => set({ dataDir: dir }),
  setFontSize: (size: number) => set({ fontSize: size }),

  loadSettings: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings>;
        set({
          deepseekApiKey: parsed.deepseekApiKey ?? '',
          dataDir: parsed.dataDir ?? '../..',
          fontSize: parsed.fontSize ?? 13,
        });
      }
    } catch {
      // use defaults
    }
  },

  saveSettings: () => {
    const { deepseekApiKey, dataDir, fontSize } = get();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        deepseekApiKey,
        dataDir,
        fontSize,
      }));
    } catch {
      // silently fail if localStorage is unavailable
    }
  },
}));
