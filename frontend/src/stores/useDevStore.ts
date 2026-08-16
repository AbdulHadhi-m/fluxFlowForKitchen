import { create } from "zustand";

interface DevState {
  isDevDrawerOpen: boolean;
  toggleDevDrawer: () => void;
}

export const useDevStore = create<DevState>((set) => ({
  isDevDrawerOpen: false,
  toggleDevDrawer: () => set((state) => ({ isDevDrawerOpen: !state.isDevDrawerOpen })),
}));
