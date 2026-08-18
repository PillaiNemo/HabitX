import { DailyLog } from '../types';

// Only ever holds *past* months — the current month always reads the live
// `logs` the dashboard already has in state, so a same-session check-in is
// reflected immediately without needing to invalidate a cache entry.
const cache = new Map<string, DailyLog[]>();

function key(userId: string, monthId: string): string {
  return `${userId}:${monthId}`;
}

export function getCachedMonthLogs(userId: string, monthId: string): DailyLog[] | undefined {
  return cache.get(key(userId, monthId));
}

export function setCachedMonthLogs(userId: string, monthId: string, logs: DailyLog[]): void {
  cache.set(key(userId, monthId), logs);
}

export function clearMonthCache(): void {
  cache.clear();
}
