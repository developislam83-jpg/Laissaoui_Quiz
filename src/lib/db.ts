import Dexie, { type EntityTable } from 'dexie';

export interface Quiz {
  id: string;
  title: string;
  code?: string;
  status: 'draft' | 'live' | 'finished';
  createdAt: number;
  launchedAt?: number;
}

export interface Stage {
  id: string;
  quizId: string;
  name: string;
  order: number;
}

export interface Question {
  id: string;
  stageId: string;
  order: number;
  type: 'mcq' | 'boolean';
  text: string;
  timeLimit: 5 | 10;
  points: number;
  imageUrl?: string;
  audioUrl?: string;
}

export interface Option {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface Contestant {
  id: string;
  quizId: string;
  name: string;
  avatarUrl: string;
  joinedAt: number;
  isRemoved: boolean;
}

export interface Answer {
  id: string;
  questionId: string;
  contestantId: string;
  selectedOptionId?: string;
  responseTimeMs: number;
  score: number;
  answeredAt: number;
}

export interface Result {
  id: string;
  quizId: string;
  stageId?: string;
  type: 'stage' | 'final' | 'chat';
  standings?: any; // Storing as JSON object natively in IndexedDB
  content?: any;
  createdAt: number;
}

const db = new Dexie('quizlive-local') as Dexie & {
  quizzes: EntityTable<Quiz, 'id'>;
  stages: EntityTable<Stage, 'id'>;
  questions: EntityTable<Question, 'id'>;
  options: EntityTable<Option, 'id'>;
  contestants: EntityTable<Contestant, 'id'>;
  answers: EntityTable<Answer, 'id'>;
  results: EntityTable<Result, 'id'>;
};

db.version(1).stores({
  quizzes: 'id, status, code',
  stages: 'id, quizId',
  questions: 'id, stageId',
  options: 'id, questionId',
  contestants: 'id, quizId, isRemoved',
  answers: 'id, questionId, contestantId',
  results: 'id, quizId, stageId'
});

export { db };
