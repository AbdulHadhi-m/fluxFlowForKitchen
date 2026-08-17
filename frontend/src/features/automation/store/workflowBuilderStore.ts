import { create } from "zustand";
import { WorkflowStep, WorkflowPayload } from "../types/automation.types";

interface BuilderState {
  steps: WorkflowStep[];
  setSteps: (steps: WorkflowStep[]) => void;
  addStep: (step: WorkflowStep) => void;
  updateStep: (code: string, patch: Partial<WorkflowStep>) => void;
  removeStep: (code: string) => void;
  moveStep: (from: number, to: number) => void;
  reset: () => void;
}

export const useWorkflowBuilderStore = create<BuilderState>((set) => ({
  steps: [],
  setSteps: (steps) => set({ steps }),
  addStep: (step) =>
    set((state) => {
      const existing = state.steps.some((s) => s.code === step.code);
      if (existing) {
        return { steps: state.steps.map((s) => (s.code === step.code ? { ...s, ...step } : s)) };
      }
      return { steps: [...state.steps, step] };
    }),
  updateStep: (code, patch) =>
    set((state) => ({
      steps: state.steps.map((s) => (s.code === code ? { ...s, ...patch } : s)),
    })),
  removeStep: (code) =>
    set((state) => ({
      steps: state.steps.filter((s) => s.code !== code),
    })),
  moveStep: (from, to) =>
    set((state) => {
      const next = [...state.steps];
      if (from < 0 || from >= next.length || to < 0 || to >= next.length) return state;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { steps: next };
    }),
  reset: () => set({ steps: [] }),
}));

export const workflowStepsToPayload = (workflow: WorkflowPayload, steps: WorkflowStep[]): WorkflowPayload => ({
  ...workflow,
  steps,
});

export const generateStepCode = (name: string): string => {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || "STEP";
};