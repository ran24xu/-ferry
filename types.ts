

export enum AppView {
  INPUT = 'INPUT',
  ANALYSIS = 'ANALYSIS',
  QUESTIONS = 'QUESTIONS',
  FAVORITES = 'FAVORITES',
  MOCK_SESSION = 'MOCK_SESSION',
  MOCK_HISTORY = 'MOCK_HISTORY'
}

export interface SelfIntro {
  style: 'Affinity' | 'Academic' | 'Practical';
  title: string;
  contentCN: string;
  contentEN: string;
}

export interface StrengthItem {
  strength: string;
  description: string;
}

export interface AnalysisResult {
  strengths: StrengthItem[];
  competencyLevel: string; // 'A' | 'B' | 'C' | 'D'
  competencyEvaluation: string;
  intros: SelfIntro[];
}

export type QuestionCategory = 'Motivation' | 'Academic' | 'Behavioral' | 'Resume' | 'Personal';

export interface QuestionItem {
  id: string;
  category: QuestionCategory;
  question: string;
  questionEN?: string;
  intent: string;
  structure: string;
  keyPoints: string;
  recommendedAnswer?: string;
  isFavorite?: boolean;
  userNotes?: string;
  practiceCount?: number;
}

export interface UserProfile {
  targetMajor: string;
  targetUni: string;
  resumeText: string;
  resumeFile?: {
    mimeType: string;
    data: string;
    name: string;
  } | null;
}

export interface MockRoundResult {
  questionId: string;
  questionText: string;
  isEnglishRound: boolean;
  audioBlob?: Blob;
  transcription: string;
  feedback: string;
  textAnswer?: string; // If user answered by text
  skipped?: boolean;
}

export interface MockSession {
    id: string;
    timestamp: number;
    rounds: MockRoundResult[];
}

export interface AppState {
  view: AppView;
  profile: UserProfile;
  analysis: AnalysisResult | null;
  questions: QuestionItem[];
  isAnalyzing: boolean;
  isGeneratingQuestions: boolean;
  mockHistory: MockSession[];
}