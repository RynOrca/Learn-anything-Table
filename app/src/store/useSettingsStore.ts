import { create } from 'zustand';
import type { Settings } from '../types';

interface SettingsState extends Settings {
  setApiKey: (key: string) => void;
  setDataDir: (dir: string) => void;
  setFontSize: (size: number) => void;
  setContext7ApiKey: (key: string) => void;
  setContext7Enabled: (enabled: boolean) => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

const STORAGE_KEY = 'learn-anything-settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  deepseekApiKey: '',
  dataDir: '../..',
  fontSize: 13,
  context7ApiKey: '',
  context7Enabled: false,

  setApiKey: (key: string) => set({ deepseekApiKey: key }),
  setDataDir: (dir: string) => set({ dataDir: dir }),
  setFontSize: (size: number) => set({ fontSize: size }),
  setContext7ApiKey: (key: string) => set({ context7ApiKey: key }),
  setContext7Enabled: (enabled: boolean) => set({ context7Enabled: enabled }),

  loadSettings: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Settings>;
        set({
          deepseekApiKey: parsed.deepseekApiKey ?? '',
          dataDir: parsed.dataDir ?? '../..',
          fontSize: parsed.fontSize ?? 13,
          context7ApiKey: parsed.context7ApiKey ?? '',
          context7Enabled: parsed.context7Enabled ?? false,
        });
      }
    } catch {
      // use defaults
    }
  },

  saveSettings: () => {
    const { deepseekApiKey, dataDir, fontSize, context7ApiKey, context7Enabled } = get();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        deepseekApiKey,
        dataDir,
        fontSize,
        context7ApiKey,
        context7Enabled,
      }));
    } catch {
      // silently fail
    }
  },
}));
