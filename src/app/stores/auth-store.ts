// stores/auth-store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  kycStatus?: string;
}

interface AuthState {
  // State
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
}

// Update your auth-store.ts with this logging
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      loading: true,
      isAuthenticated: false,

      // Actions
      setUser: (user) => {
        console.log('🟢 setUser called with:', user);
        set({
          user,
          isAuthenticated: !!user,
          loading: false,
        });
      },

      setLoading: (loading) => {
        console.log('🟡 setLoading called with:', loading);
        set({ loading });
      },

      login: (userData) => {
        console.log('🔵 login called with:', userData);
        set({
          user: userData,
          isAuthenticated: true,
          loading: false,
        });
      },

      logout: async () => {
        console.log('🔴 logout called');
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
        } catch (error) {
          console.error("Logout API error:", error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            loading: false,
          });
          //redirect to home page
            window.location.href = "/";
        }
      },

      checkAuth: async () => {
        // console.log('🔄 checkAuth called - current state:', get());
        const currentState = get();
        if (currentState.loading) {
          // console.log('⏸️ Already loading, skipping');
          return;
        }

        set({ loading: true });
        try {
          // console.log('📡 Fetching /api/auth/me...');
          const res = await fetch("/api/auth/me", { credentials: "include" });
          // console.log('📊 Response status:', res.status, 'OK?', res.ok);

          if (res.ok) {
            const data = await res.json();
            // console.log('📦 Response data:', data);

            if (data.user) {
              // console.log('👤 Setting user from API');
              set({ user: data.user, isAuthenticated: true, loading: false });
            } else {
              console.log('❌ No user in response');
              // Only clear if we don't have a user in localStorage
              if (!currentState.user) {
                console.log('🧹 Clearing auth (no cached user)');
                set({ user: null, isAuthenticated: false, loading: false });
              } else {
                console.log('💾 Keeping cached user:', currentState.user);
                set({ loading: false });
              }
            }
          } else {
            console.warn(`⚠️ HTTP error: ${res.status}, keeping cached user`);
            set({ loading: false });
          }
        } catch (error) {
          console.error("🔴 Network error:", error);
          set({ loading: false });
        }
      },

      clearAuth: () => {
        console.log('🗑️ clearAuth called');
        set({
          user: null,
          isAuthenticated: false,
          loading: false,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        // console.log('💧 Zustand rehydrating from localStorage:', state);
        
        // Fix: Set isAuthenticated based on user
        if (state && state.user) {
          // console.log('✅ Setting isAuthenticated: true from rehydrated user');
          state.isAuthenticated = true;
          state.loading = false;
        }
      },
    }
  )
);

// Optional: Create a hook for specific state slices (better performance)
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthActions = () =>
  useAuthStore((state) => ({
    login: state.login,
    logout: state.logout,
    checkAuth: state.checkAuth,
    clearAuth: state.clearAuth,
  }));
