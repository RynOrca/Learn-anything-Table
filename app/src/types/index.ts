export type ConceptStatus = 'mastered' | 'in_progress' | 'needs_practice' | 'unexplored';

export interface Concept {
  path: string;
  status: ConceptStatus;
  last_practiced: string | null;
  practice_count: number;
  confidence: number;
}

export interface TopicState {
  topic: string;
  created: string;
  concepts: Concept[];
}

export interface KnowledgeDomain {
  name: string;
  concepts: string[];
}

export interface SessionMeta {
  filename: string;
  conceptName: string;
  type: 'explain' | 'practice';
  date: string;
  summary: string;
}

export interface SessionDetail {
  filename: string;
  conceptName: string;
  type: 'explain' | 'practice';
  date: string;
  content: string;
}

export interface Phase {
  name: string;
  index: number;
  topicCount: number;
  masteredCount: number;
  progress: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ExercisePrompt {
  goal: string;
  background: string;
  requirements: string[];
  hints: string[];
  starterCode: string;
}

export interface AIReviewResult {
  acknowledgment: string;
  socraticFollowUp: string;
  edgeCases: string[];
  codeQualityTip: string;
  assessment: 'excellent' | 'good' | 'needs_work';
  confidenceChange: number;
}

export interface DashboardStats {
  topicName: string;
  totalConcepts: number;
  masteredCount: number;
  inProgressCount: number;
  needsPracticeCount: number;
  unexploredCount: number;
  overallProgress: number;
  phases: Phase[];
  recommendations: Array<{
    type: 'practice' | 'learn';
    conceptName: string;
    reason: string;
  }>;
  recentSessions: SessionMeta[];
}

export interface Settings {
  deepseekApiKey: string;
  dataDir: string;
  fontSize: number;
}
