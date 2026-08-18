import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from './lib/supabase';
import App from './App';
import { Onboarding } from './pages/Onboarding';
import Landing from './pages/Landing';
import DevPreview from './pages/DevPreview';
import { Habit, Goal } from './types';
import {
  fetchHabits, fetchGoals, fetchLogs, createHabit, createGoal, buildEmptyLogs
} from './lib/db';
import { clearMonthCache } from './lib/wrappedCache';

type AppState = 'loading' | 'landing' | 'onboarding' | 'dashboard';

function AppShell() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isNewUser, setIsNewUser] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadUserData(session.user.id);
      } else {
        setAppState('onboarding'); // show onboarding auth step
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadUserData(session.user.id);
      } else {
        setAppState('onboarding');
        setHabits([]);
        setGoals([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const [h, g] = await Promise.all([fetchHabits(userId), fetchGoals(userId)]);
      setHabits(h);
      setGoals(g);
      if (h.length === 0) {
        // New user — needs onboarding habit setup
        setIsNewUser(true);
        setAppState('onboarding');
      } else {
        setIsNewUser(false);
        setAppState('dashboard');
      }
    } catch (err) {
      console.error('Failed to load user data', err);
      // We already have a session at this point — the failure was fetching
      // data, not authenticating. Treat as "needs habit setup," not "needs
      // to sign in again," or Onboarding falls back to its auth step (step 0)
      // and the user gets shown a sign-up screen right after signing up.
      setIsNewUser(true);
      setAppState('onboarding');
    }
  };

  const handleOnboardingComplete = async (newHabits: Habit[], newGoals: Goal[]) => {
    if (!session) return;
    try {
      // Save all 5 habits to DB
      const savedHabits = await Promise.all(
        newHabits.map((h, i) => createHabit(session.user.id, h, i))
      );
      // Save goals to DB
      const savedGoals = await Promise.all(
        newGoals.map(g => createGoal(session.user.id, g))
      );
      setHabits(savedHabits);
      setGoals(savedGoals);
      setIsNewUser(true);
      setAppState('dashboard');
    } catch (err) {
      console.error('Failed to save onboarding data', err);
    }
  };

  const handleLogout = async () => {
    const { signOut } = await import('./lib/auth');
    await signOut();
    clearMonthCache();
    setAppState('onboarding');
  };

  if (appState === 'loading') {
    return (
      <div className="fixed inset-0 bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 bg-[#00FF9C] rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 13 13" fill="none" width="13" height="13">
              <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="#080808"/>
              <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="#080808"/>
              <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="#080808"/>
              <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="#080808"/>
            </svg>
          </div>
          <div className="w-4 h-4 border-2 border-[#00FF9C]/20 border-t-[#00FF9C] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (appState === 'onboarding') {
    return (
      <Onboarding
        session={session}
        onAuthSuccess={(s) => {
          setSession(s);
          loadUserData(s.user.id);
        }}
        onComplete={handleOnboardingComplete}
        needsHabits={!!session && isNewUser}
      />
    );
  }

  return (
    <App
      userId={session!.user.id}
      initialHabits={habits}
      initialGoals={goals}
      isNewUser={isNewUser}
      onLogout={handleLogout}
    />
  );
}

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppShell />} />
        <Route path="/preview" element={<DevPreview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default Router;
