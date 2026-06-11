import { create } from 'zustand';
import type { TopicState, DashboardStats, SessionMeta, SessionDetail, ConceptStatus } from '../types';
import * as filesApi from '../api/files';

interface LearningState {
  topicName: string | null;
  state: TopicState | null;
  knowledgeMap: string | null;
  sessions: SessionMeta[];
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;

  loadTopic: (name: string) => Promise<void>;
  loadSessions: (search?: string) => Promise<void>;
  loadSessionDetail: (filename: string) => Promise<SessionDetail | null>;
  updateConceptStatus: (path: string, status: ConceptStatus, confidence: number) => Promise<void>;
  saveSession: (conceptName: string, type: 'explain' | 'practice', content: string) => Promise<void>;
  refreshStats: () => void;
}

export const useLearningStore = create<LearningState>((set, get) => ({
  topicName: null,
  state: null,
  knowledgeMap: null,
  sessions: [],
  stats: null,
  loading: false,
  error: null,

  loadTopic: async (name: string) => {
    set({ loading: true, error: null, topicName: name });
    try {
      const [state, knowledgeMap, sessions] = await Promise.all([
        filesApi.fetchState(name),
        filesApi.fetchKnowledgeMap(name),
        filesApi.fetchSessions(name),
      ]);
      const stats = filesApi.computeStats(state, sessions);
      set({ state, knowledgeMap, sessions, stats, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  loadSessions: async (search?: string) => {
    const { topicName } = get();
    if (!topicName) return;
    try {
      const sessions = await filesApi.fetchSessions(topicName, search);
      set({ sessions });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  loadSessionDetail: async (filename: string) => {
    const { topicName } = get();
    if (!topicName) return null;
    try {
      return await filesApi.fetchSessionDetail(topicName, filename);
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  updateConceptStatus: async (path: string, status: ConceptStatus, confidence: number) => {
    const { topicName, state } = get();
    if (!topicName || !state) return;
    try {
      await filesApi.updateState(topicName, state, path, status, confidence);
      await get().loadTopic(topicName);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  saveSession: async (conceptName: string, type: 'explain' | 'practice', content: string) => {
    const { topicName } = get();
    if (!topicName) return;
    try {
      await filesApi.createSession(topicName, conceptName, type, content);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  refreshStats: () => {
    const { state, sessions } = get();
    if (!state) return;
    const stats = filesApi.computeStats(state, sessions);
    set({ stats });
  },
}));
