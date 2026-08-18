import React from 'react';
import { Activity, Book, Wind, Flame, Zap, Timer, Dumbbell, Target, Trophy, BarChart3, Calendar, Rocket, Award, Heart, Moon, Droplets, Leaf, Briefcase, GraduationCap, Code, Music, Utensils, Coffee, Plane, Camera, Bike, Mountain, Smile, Laptop } from 'lucide-react';
import { Habit, DailyLog } from './types';

export const HABIT_ICONS: Record<string, React.ReactNode> = {
  exercise: <Activity className="w-4 h-4" />, read: <Book className="w-4 h-4" />,
  meditate: <Wind className="w-4 h-4" />, calories: <Zap className="w-4 h-4" />,
  run: <Timer className="w-4 h-4" />, fire: <Flame className="w-4 h-4" />,
  dumbbell: <Dumbbell className="w-4 h-4" />, target: <Target className="w-4 h-4" />,
  trophy: <Trophy className="w-4 h-4" />, chart: <BarChart3 className="w-4 h-4" />,
  calendar: <Calendar className="w-4 h-4" />, rocket: <Rocket className="w-4 h-4" />,
  award: <Award className="w-4 h-4" />, heart: <Heart className="w-4 h-4" />,
  sleep: <Moon className="w-4 h-4" />, hydration: <Droplets className="w-4 h-4" />,
  nature: <Leaf className="w-4 h-4" />, work: <Briefcase className="w-4 h-4" />,
  learning: <GraduationCap className="w-4 h-4" />, coding: <Code className="w-4 h-4" />,
  music: <Music className="w-4 h-4" />, food: <Utensils className="w-4 h-4" />,
  coffee: <Coffee className="w-4 h-4" />, travel: <Plane className="w-4 h-4" />,
  photo: <Camera className="w-4 h-4" />, bike: <Bike className="w-4 h-4" />,
  mountain: <Mountain className="w-4 h-4" />, mood: <Smile className="w-4 h-4" />,
  laptop: <Laptop className="w-4 h-4" />,
};

// For new users — all empty, no fake history
export function generateEmptyLogs(habits: Habit[]): DailyLog[] {
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(today.getDate() - i);
    const completions: Record<string, boolean> = {};
    habits.forEach(h => { completions[h.id] = false; });
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      day: days[d.getDay()],
      progress: 0,
      completions,
      status: 'IDLE' as const,
      dateStr: d.toISOString().split('T')[0],
    };
  });
}
