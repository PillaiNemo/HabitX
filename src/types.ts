export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  consistency: number;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  target: number;
  current: number;
  unit: string;
}

export interface DailyLog {
  date: string;
  day: string;
  progress: number;
  completions: Record<string, boolean>;
  status: 'IDLE' | 'STABLE' | 'PEAK';
  dateStr?: string; // YYYY-MM-DD for DB operations
}

export type Theme = 'dark' | 'light';
