import React, { useState } from 'react';
import { Rocket, Trash2 } from 'lucide-react';
import { HABIT_ICONS } from '../constants';
import { Habit, Goal } from '../types';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '../lib/auth';
import type { Session } from '../lib/supabase';

interface OnboardingProps {
  session: Session | null;
  onAuthSuccess: (session: Session) => void;
  onComplete: (habits: Habit[], goals: Goal[]) => void;
  needsHabits: boolean; // true = already authed, just needs habit setup
}

const COLORS = ['#00FF9C','#00D1FF','#B026FF','#FF0055','#FFB800','#fbbf24','#4ade80','#f87171','#38bdf8','#c084fc'];
const ICON_KEYS = Object.keys(HABIT_ICONS).slice(0, 15);
const MIN_HABITS = 3;
const MAX_HABITS = 5;

const GOOGLE_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#EA4335" d="M5.27 9.77A7.1 7.1 0 0 1 12 4.9c1.69 0 3.22.6 4.41 1.59l3.3-3.3A11.9 11.9 0 0 0 12 1C7.31 1 3.26 3.81 1.28 7.82l3.99 1.95z"/>
    <path fill="#34A853" d="M16.04 18.01A7.07 7.07 0 0 1 12 19.1c-2.89 0-5.38-1.73-6.6-4.25l-3.97 1.98A11.9 11.9 0 0 0 12 23c2.97 0 5.73-1.06 7.83-2.82l-3.79-2.17z"/>
    <path fill="#FBBC05" d="M19.83 20.18A11.9 11.9 0 0 0 23 12c0-.68-.07-1.35-.18-2H12v4.5h6.19a5.37 5.37 0 0 1-2.15 3.51l3.79 2.17z"/>
    <path fill="#4285F4" d="M1.28 7.82A11.9 11.9 0 0 0 1 12c0 1.45.26 2.84.73 4.13l3.97-1.98A7.1 7.1 0 0 1 4.9 12c0-.77.13-1.52.36-2.23L1.28 7.82z"/>
  </svg>
);

interface NewHabit { name: string; icon: string; color: string; }
const emptyHabit = (i: number): NewHabit => ({ name: '', icon: ICON_KEYS[i % ICON_KEYS.length], color: COLORS[i % COLORS.length] });

const HabitBuilder: React.FC<{ habit: NewHabit; index: number; onChange: (h: NewHabit) => void; hasError: boolean; onRemove?: () => void }> = ({ habit, index, onChange, hasError, onRemove }) => (
  <div className={`border rounded-xl p-3.5 bg-[var(--color-bg)] transition-colors ${hasError ? 'border-red-500/50' : 'border-[var(--color-border)]'}`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-[8px] font-bold opacity-35 uppercase tracking-widest">Habit {index + 1}</span>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: habit.color }} />
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
        )}
      </div>
    </div>
    <div className="space-y-2.5">
      <div>
        <label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Name</label>
        <input value={habit.name} onChange={e => onChange({ ...habit, name: e.target.value })} placeholder="e.g. Meditate, Run, Read..."
          className={`w-full bg-[var(--color-card)] border rounded-lg px-3 py-2 text-[11px] text-[var(--color-text)] focus:border-blue-500 outline-none transition-colors ${hasError && !habit.name.trim() ? 'border-red-500/50' : 'border-[var(--color-border)]'}`} />
      </div>
      <div>
        <label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Icon</label>
        <div className="grid grid-cols-8 gap-1">
          {ICON_KEYS.map(k => (
            <button key={k} type="button" onClick={() => onChange({ ...habit, icon: k })}
              className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${habit.icon === k ? 'border-blue-500 text-blue-500' : 'border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-gray-500'}`}>
              <span className="scale-[.7]">{HABIT_ICONS[k]}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[7px] font-bold opacity-25 uppercase tracking-widest block mb-1">Color</label>
        <div className="flex gap-1.5 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => onChange({ ...habit, color: c })}
              className={`w-4 h-4 rounded-full transition-all ${habit.color === c ? 'scale-125 ring-2 ring-offset-1 ring-offset-[var(--color-bg)]' : 'hover:scale-110'}`}
              style={{ background: c, '--tw-ring-color': c } as React.CSSProperties} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const Onboarding: React.FC<OnboardingProps> = ({ session, onAuthSuccess, onComplete, needsHabits }) => {
  // step 0 = auth, step 1 = habits, step 2 = milestones
  const [step, setStep] = useState(needsHabits ? 1 : 0);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [habits, setHabits] = useState<NewHabit[]>(Array.from({ length: MIN_HABITS }, (_, i) => emptyHabit(i)));
  const [goal1, setGoal1] = useState({ name: '', target: '', unit: 'km' });
  const [goal2, setGoal2] = useState({ name: '', target: '', unit: 'books' });
  const [goal1Error, setGoal1Error] = useState(false);
  const [habitErrors, setHabitErrors] = useState<boolean[]>(Array(MIN_HABITS).fill(false));

  const handleEmailAuth = async () => {
    if (!email || !password) { setAuthError('Please fill in all fields.'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      let data;
      if (authMode === 'signup') data = await signUpWithEmail(email, password);
      else data = await signInWithEmail(email, password);
      if (data.session) onAuthSuccess(data.session);
      else if (authMode === 'signup') setAuthError('Check your email to confirm your account, then sign in.');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    } finally { setAuthLoading(false); }
  };

  const handleGoogleAuth = async () => {
    try { await signInWithGoogle(); } catch (err: any) { setAuthError(err.message); }
  };

  const updateHabit = (i: number, h: NewHabit) => {
    setHabits(prev => prev.map((x, idx) => idx === i ? h : x));
    setHabitErrors(prev => { const n = [...prev]; n[i] = false; return n; });
  };

  const addHabit = () => {
    setHabits(prev => prev.length < MAX_HABITS ? [...prev, emptyHabit(prev.length)] : prev);
    setHabitErrors(prev => prev.length < MAX_HABITS ? [...prev, false] : prev);
  };

  const removeHabit = (i: number) => {
    if (habits.length <= MIN_HABITS) return;
    setHabits(prev => prev.filter((_, idx) => idx !== i));
    setHabitErrors(prev => prev.filter((_, idx) => idx !== i));
  };

  const validateHabits = () => {
    const errs = habits.map(h => !h.name.trim());
    setHabitErrors(errs);
    return !errs.some(Boolean);
  };

  const handleFinish = () => {
    if (!goal1.name.trim()) { setGoal1Error(true); return; }
    const finalHabits: Habit[] = habits.map((h, i) => ({ id: `h-${i}`, name: h.name.trim(), icon: h.icon, color: h.color, consistency: 0 }));
    const finalGoals: Goal[] = [];
    if (goal1.name) finalGoals.push({ id: 'g1', name: goal1.name, icon: 'trophy', current: 0, target: parseFloat(goal1.target) || 100, unit: goal1.unit || 'km', color: '#38bdf8' });
    if (goal2.name) finalGoals.push({ id: 'g2', name: goal2.name, icon: 'target', current: 0, target: parseFloat(goal2.target) || 100, unit: goal2.unit || 'units', color: '#c084fc' });
    onComplete(finalHabits, finalGoals);
  };

  const totalSteps = needsHabits ? 2 : 3;
  const currentDotStep = needsHabits ? step - 1 : step;
  const dots = Array.from({ length: totalSteps }, (_, i) => (
    <div key={i} className={`h-[3px] flex-1 rounded-full transition-all ${i <= currentDotStep ? 'bg-blue-500' : 'bg-gray-500/20'}`} />
  ));

  return (
    <div className="fixed inset-0 bg-[var(--color-bg)] flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-[480px] shadow-2xl my-auto">
        <div className="flex gap-1.5 mb-5">{dots}</div>

        {/* ── STEP 0: AUTH ── */}
        {step === 0 && (
          <>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0"><Rocket size={14} className="text-white" /></div>
              <h1 className="text-[18px] font-bold tracking-tight">
                {authMode === 'signup' ? 'Welcome to HabitX' : 'Welcome back'}
              </h1>
            </div>
            <p className="text-[11px] opacity-40 mb-5 leading-relaxed">
              {authMode === 'signup' ? 'Build systems, not goals. Track what matters, every single day.' : 'Sign in to continue your protocol.'}
            </p>
            <button onClick={handleGoogleAuth} className="w-full py-3 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center gap-2.5 text-[12px] font-semibold hover:border-blue-400/40 transition-all mb-3">
              {GOOGLE_ICON} Continue with Google
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-[8px] font-bold opacity-28 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>
            <div className="space-y-2.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[7px] font-bold opacity-28 uppercase tracking-widest">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[12px] text-[var(--color-text)] focus:border-blue-500 outline-none transition-colors" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[7px] font-bold opacity-28 uppercase tracking-widest">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={authMode === 'signup' ? 'Create a password' : 'Your password'}
                  onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[12px] text-[var(--color-text)] focus:border-blue-500 outline-none transition-colors" />
              </div>
              {authError && <p className="text-[10px] text-red-500">{authError}</p>}
              <button onClick={handleEmailAuth} disabled={authLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-bold py-3 rounded-xl tracking-widest uppercase transition-all mt-1 flex items-center justify-center gap-2">
                {authLoading && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                {authMode === 'signup' ? 'Create Account →' : 'Sign In →'}
              </button>
              <p className="text-[10px] opacity-35 text-center mt-2">
                {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                {' '}<span className="text-blue-500 cursor-pointer underline" onClick={() => { setAuthMode(m => m === 'signup' ? 'login' : 'signup'); setAuthError(''); }}>
                  {authMode === 'signup' ? 'Sign in' : 'Sign up'}
                </span>
              </p>
            </div>
          </>
        )}

        {/* ── STEP 1: HABITS ── */}
        {step === 1 && (
          <>
            <h1 className="text-[17px] font-bold tracking-tight mb-1">Build your habits</h1>
            <p className="text-[11px] opacity-40 mb-4 leading-relaxed">Pick {MIN_HABITS}–{MAX_HABITS} habits you want to track daily — name each one and choose an icon and colour.</p>
            <div className="flex flex-col gap-2.5 max-h-[52vh] overflow-y-auto pr-1 no-scrollbar">
              {habits.map((h, i) => (
                <HabitBuilder key={i} habit={h} index={i} onChange={u => updateHabit(i, u)} hasError={habitErrors[i]}
                  onRemove={habits.length > MIN_HABITS ? () => removeHabit(i) : undefined} />
              ))}
            </div>
            {habits.length < MAX_HABITS && (
              <button type="button" onClick={addHabit}
                className="w-full mt-2.5 border border-dashed border-gray-500/25 rounded-xl py-2.5 text-[10px] font-bold opacity-50 hover:opacity-100 hover:border-blue-500/50 transition-all uppercase tracking-widest">
                + Add another habit
              </button>
            )}
            <div className="flex items-center justify-between mt-3 mb-1">
              <span className="text-[10px] opacity-35">
                {habits.filter(h => h.name.trim()).length}/{habits.length} named ({MIN_HABITS}–{MAX_HABITS} allowed)
              </span>
            </div>
            {habitErrors.some(Boolean) && <p className="text-[10px] text-red-500 mb-2">Please name every habit you've added.</p>}
            <button onClick={() => { if (validateHabits()) setStep(2); }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-3 rounded-xl tracking-widest uppercase transition-all mt-2">
              Continue →
            </button>
          </>
        )}

        {/* ── STEP 2: MILESTONES ── */}
        {step === 2 && (
          <>
            <h1 className="text-[17px] font-bold tracking-tight mb-1">Set your milestones</h1>
            <p className="text-[11px] opacity-40 mb-4 leading-relaxed">Big goals your habits contribute to. At least one required.</p>
            {[
              { label: 'Milestone 1', state: goal1, setState: setGoal1, required: true, error: goal1Error },
              { label: 'Milestone 2', state: goal2, setState: setGoal2, required: false, error: false },
            ].map(({ label, state, setState, required, error }) => (
              <div key={label} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 mb-3">
                <p className="text-[8px] font-bold opacity-38 uppercase tracking-widest mb-3">
                  {label} {!required && <span className="font-normal opacity-55 normal-case">(optional)</span>}
                </p>
                <div className="flex flex-col gap-1.5 mb-2">
                  <label className="text-[7px] font-bold opacity-25 uppercase tracking-widest">Name</label>
                  <input value={state.name} onChange={e => { setState(s => ({ ...s, name: e.target.value })); if (error) setGoal1Error(false); }}
                    placeholder="e.g. Run 500km"
                    className={`w-full bg-[var(--color-card)] border ${error ? 'border-red-500' : 'border-[var(--color-border)]'} rounded-lg px-3 py-2 text-[11px] text-[var(--color-text)] focus:border-blue-500 outline-none`} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[7px] font-bold opacity-25 uppercase tracking-widest">Target</label>
                    <input type="number" value={state.target} onChange={e => setState(s => ({ ...s, target: e.target.value }))} placeholder="100"
                      className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[11px] text-[var(--color-text)] focus:border-blue-500 outline-none" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[7px] font-bold opacity-25 uppercase tracking-widest">Unit</label>
                    <input value={state.unit} onChange={e => setState(s => ({ ...s, unit: e.target.value }))} placeholder="km, books…"
                      className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[11px] text-[var(--color-text)] focus:border-blue-500 outline-none" />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={handleFinish} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-3 rounded-xl tracking-widest uppercase transition-all mt-2">
              Start Tracking →
            </button>
          </>
        )}
      </div>
    </div>
  );
};
