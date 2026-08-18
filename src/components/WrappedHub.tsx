import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Habit, Goal, DailyLog } from '../types';
import { computeMonthlyStats, computeArchetype, computeMilestone } from '../lib/wrapped';
import { computeInsights } from '../lib/insights';
import {
  currentMonthId, isCurrentMonth, monthIdFromDateStr, monthIdRange, monthLabel, shiftMonthId, buildMonthInsights,
} from '../lib/wrappedMonth';
import { fetchLogsForMonth, fetchEarliestLogMonth } from '../lib/db';
import { getCachedMonthLogs, setCachedMonthLogs } from '../lib/wrappedCache';
import { WrappedExperience } from './WrappedExperience';
import { MonthDeck, MonthCardData } from './MonthDeck';
import { MonthListView } from './MonthListView';
import { MonthInsights } from './MonthInsights';
import { MonthlyReport } from './MonthlyReport';

type Screen = 'deck' | 'list' | 'story' | 'insights' | 'report';

function WrappedHubLoading() {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#05060c]">
      <div className="w-6 h-6 border-2 border-[#00FF9C]/20 border-t-[#00FF9C] rounded-full animate-spin" />
    </div>
  );
}

const DECK_LOOKBACK_CAP = 12; // months
const FANNED_COUNT = 4;

interface WrappedHubProps {
  habits: Habit[];
  goals: Goal[];
  logs: DailyLog[]; // live, trailing-30-day window the dashboard already holds
  userId: string;
  initialScreen: 'deck' | 'story';
  // When provided (preview/demo harness only), the month deck is built
  // entirely from this in-memory history instead of Supabase — lets a
  // fake-user session show a fully populated deck/insights/report.
  mockLogs?: DailyLog[];
  onClose: () => void;
}

export const WrappedHub: React.FC<WrappedHubProps> = ({ habits, goals, logs, userId, initialScreen, mockLogs, onClose }) => {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [cards, setCards] = useState<MonthCardData[]>([]);
  const [earliestMonthId, setEarliestMonthId] = useState<string | null>(null);
  const [deckLoading, setDeckLoading] = useState(initialScreen === 'deck');
  const deckLoadedRef = useRef(false);
  // True until the component truly unmounts (unlike a per-effect-run
  // "cancelled" flag, this survives React StrictMode's dev-only synthetic
  // mount→cleanup→mount, which would otherwise mark the one real fetch
  // "cancelled" via the first (throwaway) invocation's cleanup, since
  // deckLoadedRef already stops a second fetch from ever starting).
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const [activeMonthId, setActiveMonthId] = useState<string>(currentMonthId());
  const [originScreen, setOriginScreen] = useState<'deck' | 'list'>('deck');
  const [focusHabitId, setFocusHabitId] = useState<string | undefined>(undefined);
  const [activeLogs, setActiveLogs] = useState<DailyLog[] | null>(null);
  const [activePrevLogs, setActivePrevLogs] = useState<DailyLog[] | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);

  const loadMonthLogs = useCallback(async (monthId: string): Promise<DailyLog[]> => {
    if (mockLogs) {
      return mockLogs.filter(l => l.dateStr && monthIdFromDateStr(l.dateStr) === monthId);
    }
    if (isCurrentMonth(monthId)) {
      return logs.filter(l => l.dateStr && monthIdFromDateStr(l.dateStr) === monthId);
    }
    const cached = getCachedMonthLogs(userId, monthId);
    if (cached) return cached;
    try {
      const fetched = await fetchLogsForMonth(userId, habits, monthId);
      setCachedMonthLogs(userId, monthId, fetched);
      return fetched;
    } catch (err) {
      console.error('Failed to load month logs', err);
      return [];
    }
  }, [mockLogs, logs, userId, habits]);

  // Deck load: one earliest-month lookup, then a bounded, parallel per-month
  // fetch (each result immediately cached) so opening any fanned/list month
  // afterward is a cache hit rather than a fresh round trip.
  useEffect(() => {
    if (screen !== 'deck' || deckLoadedRef.current) return;
    deckLoadedRef.current = true;

    (async () => {
      setDeckLoading(true);
      let earliest: string | null = null;
      if (mockLogs) {
        const withDates = mockLogs.filter(l => l.dateStr).sort((a, b) => (a.dateStr! < b.dateStr! ? -1 : 1));
        earliest = withDates.length ? monthIdFromDateStr(withDates[0].dateStr!) : null;
      } else {
        try {
          earliest = await fetchEarliestLogMonth(userId);
        } catch (err) {
          console.error('Failed to load earliest log month', err);
        }
      }
      if (!isMountedRef.current) return;
      setEarliestMonthId(earliest);

      if (!earliest) {
        setCards([]);
        setDeckLoading(false);
        return;
      }

      const cur = currentMonthId();
      const cappedStart = monthIdRange(earliest, cur).length > DECK_LOOKBACK_CAP ? shiftMonthId(cur, -(DECK_LOOKBACK_CAP - 1)) : earliest;
      const range = monthIdRange(cappedStart, cur).reverse(); // most recent first

      const built = await Promise.all(range.map(async (monthId): Promise<MonthCardData> => {
        const monthLogs = await loadMonthLogs(monthId);
        const totalCheckins = monthLogs.reduce((s, l) => s + Object.values(l.completions).filter(Boolean).length, 0);
        const avgComplete = monthLogs.length ? Math.round(monthLogs.reduce((s, l) => s + l.progress, 0) / monthLogs.length) : 0;
        const topHabitRaw = habits
          .map(h => ({ habit: h, count: monthLogs.filter(l => l.completions[h.id]).length }))
          .sort((a, b) => b.count - a.count)[0];
        const topHabit = topHabitRaw && topHabitRaw.count > 0 ? topHabitRaw.habit : null;
        return {
          monthId,
          label: monthLabel(monthId),
          topHabitColor: topHabit?.color ?? '#00FF9C',
          topHabitIcon: topHabit?.icon ?? 'rocket',
          isCurrent: isCurrentMonth(monthId),
          previewLine: monthLogs.length ? `${avgComplete}% avg · ${totalCheckins} check-ins` : 'No activity yet',
        };
      }));

      if (!isMountedRef.current) return;
      setCards(built);
      setDeckLoading(false);
    })();
  }, [screen, userId, habits, mockLogs, loadMonthLogs]);

  // Load the active month's (and its predecessor's) logs whenever we enter
  // Insights/Report for a given month, or navigate months within Report.
  useEffect(() => {
    if (screen !== 'insights' && screen !== 'report') return;
    let cancelled = false;
    (async () => {
      setMonthLoading(true);
      const [monthLogs, prevLogs] = await Promise.all([
        loadMonthLogs(activeMonthId),
        loadMonthLogs(shiftMonthId(activeMonthId, -1)),
      ]);
      if (cancelled) return;
      setActiveLogs(monthLogs);
      setActivePrevLogs(prevLogs.length ? prevLogs : null);
      setMonthLoading(false);
    })();
    return () => { cancelled = true; };
  }, [screen, activeMonthId, loadMonthLogs]);

  const openInsightsFrom = (from: 'deck' | 'list') => (monthId: string) => {
    setActiveMonthId(monthId);
    setOriginScreen(from);
    setScreen('insights');
  };

  const openReport = (monthId: string, habitId?: string) => {
    setActiveMonthId(monthId);
    setFocusHabitId(habitId);
    setScreen('report');
  };

  const handleNavigateReportMonth = (delta: 1 | -1) => {
    const next = shiftMonthId(activeMonthId, delta);
    if (delta === 1 && isCurrentMonth(activeMonthId)) return;
    if (delta === -1 && earliestMonthId && activeMonthId === earliestMonthId) return;
    setFocusHabitId(undefined);
    setActiveMonthId(next);
  };

  const stats = useMemo(() => {
    if (!activeLogs) return null;
    return computeMonthlyStats(habits, activeLogs, activePrevLogs);
  }, [habits, activeLogs, activePrevLogs]);

  const insights = useMemo(() => {
    if (!stats || !activeLogs) return [];
    const archetype = computeArchetype(stats, activeLogs);
    const milestone = isCurrentMonth(activeMonthId) ? computeMilestone(goals) : null;
    const habitInsights = computeInsights(habits, activeLogs);
    return buildMonthInsights({ stats, archetype, milestone, habitInsights });
  }, [stats, activeLogs, activeMonthId, goals, habits]);

  if (screen === 'story') {
    return <WrappedExperience habits={habits} goals={goals} logs={logs} onClose={onClose} />;
  }

  if (screen === 'deck') {
    if (deckLoading) {
      return <WrappedHubLoading />;
    }
    return (
      <MonthDeck
        months={cards.slice(0, FANNED_COUNT)}
        onOpenMonth={openInsightsFrom('deck')}
        onViewAll={cards.length > FANNED_COUNT ? () => setScreen('list') : undefined}
        onClose={onClose}
      />
    );
  }

  if (screen === 'list') {
    return <MonthListView months={cards} onSelectMonth={openInsightsFrom('list')} onBack={() => setScreen('deck')} onClose={onClose} />;
  }

  if (screen === 'insights') {
    if (monthLoading || !activeLogs) {
      return <WrappedHubLoading />;
    }
    return (
      <MonthInsights
        monthId={activeMonthId}
        insights={insights}
        onInsightTap={(habitId) => openReport(activeMonthId, habitId)}
        onSeeFullReport={() => openReport(activeMonthId)}
        onBack={() => setScreen(originScreen)}
        onClose={onClose}
        onReplayStory={isCurrentMonth(activeMonthId) ? () => setScreen('story') : undefined}
      />
    );
  }

  // 'report'
  if (monthLoading || !activeLogs) {
    return <WrappedHubLoading />;
  }
  return (
    <MonthlyReport
      monthId={activeMonthId}
      habits={habits}
      goals={goals}
      logs={activeLogs}
      prevMonthLogs={activePrevLogs}
      earliestMonthId={earliestMonthId}
      focusHabitId={focusHabitId}
      onNavigateMonth={handleNavigateReportMonth}
      onBack={() => setScreen('insights')}
      onClose={onClose}
    />
  );
};

export default WrappedHub;
