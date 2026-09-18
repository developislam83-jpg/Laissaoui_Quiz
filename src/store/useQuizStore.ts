import { create } from 'zustand';

interface QuizState {
  currentStage: number;
  score: number;
  setStage: (stage: number) => void;
  addScore: (points: number) => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  currentStage: 0,
  score: 0,
  setStage: (stage) => set({ currentStage: stage }),
  addScore: (points) => set((state) => ({ score: state.score + points })),
}));
