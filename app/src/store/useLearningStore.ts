import { create } from 'zustand';
import type { TopicState, DashboardStats, SessionMeta, SessionDetail, ConceptStatus, ChatMessage, ExercisePrompt, AIReviewResult } from '../types';
import * as filesApi from '../api/files';

/** Per-concept exercise state — persisted in memory across navigation */
export interface ConceptExerciseData {
  exercise: ExercisePrompt | null;
  exerciseRaw: string;
  code: string;
  output: string;
  review: AIReviewResult | null;
  reviewRaw: string;
}

interface LearningState {
  topicName: string | null;
  state: TopicState | null;
  knowledgeMap: string | null;
  sessions: SessionMeta[];
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  /** Per-concept chat messages, keyed by concept path */
  chatMessages: Record<string, ChatMessage[]>;
  /** Per-concept exercise state, keyed by concept path */
  exerciseData: Record<string, ConceptExerciseData>;
  /** Per-topic plan content override (after AI adjustment), keyed by topic name */
  planOverrides: Record<string, string>;

  loadTopic: (name: string) => Promise<void>;
  loadSessions: (search?: string) => Promise<void>;
  loadSessionDetail: (filename: string) => Promise<SessionDetail | null>;
  updateConceptStatus: (path: string, status: ConceptStatus, confidence: number) => Promise<void>;
  saveSession: (conceptName: string, type: 'explain' | 'practice', content: string) => Promise<void>;
  deleteSession: (filename: string) => Promise<void>;
  deleteTopic: (topicName: string) => Promise<void>;
  refreshStats: () => void;
  setChatMessages: (conceptPath: string, messages: ChatMessage[]) => void;
  clearChatMessages: (conceptPath: string) => void;
  setExerciseData: (conceptPath: string, data: Partial<ConceptExerciseData>) => void;
  clearExerciseData: (conceptPath: string) => void;
  setPlanOverride: (topicName: string, planMd: string) => void;
  clearPlanOverride: (topicName: string) => void;
}

export const useLearningStore = create<LearningState>((set, get) => ({
  topicName: null,
  state: null,
  knowledgeMap: null,
  sessions: [],
  stats: null,
  loading: false,
  error: null,
  chatMessages: {},
  exerciseData: {},
  planOverrides: {},

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
    if (!topicName) throw new Error('未选择学习主题');
    await filesApi.createSession(topicName, conceptName, type, content);
    // Refresh sessions list
    const sessions = await filesApi.fetchSessions(topicName);
    const { state } = get();
    if (state) {
      const stats = filesApi.computeStats(state, sessions);
      set({ sessions, stats });
    } else {
      set({ sessions });
    }
  },

  deleteSession: async (filename: string) => {
    const { topicName, sessions } = get();
    if (!topicName) return;
    try {
      await filesApi.deleteSession(topicName, filename);
      // Reload sessions after deletion
      const updated = await filesApi.fetchSessions(topicName);
      set({ sessions: updated });
      // Refresh stats too
      const { state } = get();
      if (state) {
        const stats = filesApi.computeStats(state, updated);
        set({ stats });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  deleteTopic: async (topicName: string) => {
    await filesApi.deleteTopic(topicName);
    const { topicName: current } = get();
    if (current === topicName) {
      // Clear current topic data
      set({
        topicName: null,
        state: null,
        knowledgeMap: null,
        sessions: [],
        stats: null,
        chatMessages: {},
        exerciseData: {},
        planOverrides: {},
      });
    }
  },

  refreshStats: () => {
    const { state, sessions } = get();
    if (!state) return;
    const stats = filesApi.computeStats(state, sessions);
    set({ stats });
  },

  setChatMessages: (conceptPath: string, messages: ChatMessage[]) => {
    const { chatMessages } = get();
    set({ chatMessages: { ...chatMessages, [conceptPath]: messages } });
  },

  clearChatMessages: (conceptPath: string) => {
    const { chatMessages } = get();
    const next = { ...chatMessages };
    delete next[conceptPath];
    set({ chatMessages: next });
  },

  setExerciseData: (conceptPath: string, data: Partial<ConceptExerciseData>) => {
    const { exerciseData } = get();
    const current = exerciseData[conceptPath] ?? {
      exercise: null,
      exerciseRaw: '',
      code: '',
      output: '',
      review: null,
      reviewRaw: '',
    };
    set({
      exerciseData: {
        ...exerciseData,
        [conceptPath]: { ...current, ...data },
      },
    });
  },

  clearExerciseData: (conceptPath: string) => {
    const { exerciseData } = get();
    const next = { ...exerciseData };
    delete next[conceptPath];
    set({ exerciseData: next });
  },

  setPlanOverride: (topicName: string, planMd: string) => {
    const { planOverrides } = get();
    set({ planOverrides: { ...planOverrides, [topicName]: planMd } });
  },

  clearPlanOverride: (topicName: string) => {
    const { planOverrides } = get();
    const next = { ...planOverrides };
    delete next[topicName];
    set({ planOverrides: next });
  },
}));
