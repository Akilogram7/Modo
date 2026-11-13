import type { ComponentProps } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, startOfDay, startOfWeek, type ModeGoal, type ModeSession } from './statsMath';

// EVERYTHING IN THIS FILE IS FAKE.
// It lets us build the stats screen now. Later:
//   - sessions come from a Supabase table that records when modes turn on and off
//   - goals come from what the user sets
//   - impact numbers come from real tracking (only keep the ones Modo actually does!)

export type StatMode = {
  id: string;
  label: string;
  color: string;
  image: ImageSourcePropType;
};

// Same colours and characters as the home screen cards
export const STAT_MODES: StatMode[] = [
  {
    id: 'study',
    label: 'Study',
    color: '#5B6BB5',
    image: require('../../assets/HomePage/ModoStudy.png'),
  },
  {
    id: 'sleep',
    label: 'Sleep',
    color: '#D4709A',
    image: require('../../assets/HomePage/ModoSleep.png'),
  },
  {
    id: 'commute',
    label: 'Commute',
    color: '#7CC4A4',
    image: require('../../assets/HomePage/ModoRun.png'),
  },
];

export const SAMPLE_GOALS: ModeGoal[] = [
  { modeId: 'study', kind: 'hours', target: 10 },
  { modeId: 'sleep', kind: 'days', target: 7 },
  { modeId: 'commute', kind: 'days', target: 5 },
];

type IconName = ComponentProps<typeof Ionicons>['name'];

export const SAMPLE_IMPACT: { icon: IconName; value: string; label: string; color: string }[] = [
  { icon: 'notifications-off', value: '142', label: 'notifications silenced', color: '#F5A623' },
  { icon: 'flash', value: '9', label: 'times a mode started on its own', color: '#9B8AE0' },
];

// A random number generator that gives the same numbers every time,
// so the fake stats don't jump around every time you reload
function seededRandom(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296;
    return x / 4294967296;
  };
}

// Makes about 4 weeks of believable mode history ending right now
export function makeSampleSessions(now: Date = new Date()): ModeSession[] {
  const random = seededRandom(7);
  const sessions: ModeSession[] = [];
  const thisWeekStart = startOfWeek(now);

  function add(modeId: string, day: Date, startHour: number, minutes: number) {
    const start = new Date(day);
    start.setMinutes(Math.round(startHour * 60));
    const end = new Date(start.getTime() + minutes * 60000);
    sessions.push({
      id: `${modeId}-${start.getTime()}`,
      modeId,
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
    });
  }

  for (let daysAgo = 27; daysAgo >= 0; daysAgo--) {
    const day = addDays(startOfDay(now), -daysAgo);
    const weekday = (day.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
    const isWeekend = weekday >= 5;
    const isThisWeek = day.getTime() >= thisWeekStart.getTime();

    // Study: most weekday evenings, a bit more this week so the stats show a change
    if (!isWeekend && random() < (isThisWeek ? 0.95 : 0.65)) {
      add('study', day, 19 + random() * 1.5, 60 + random() * 90);
    }
    // Study: some weekend afternoons
    if (isWeekend && random() < 0.35) {
      add('study', day, 13 + random() * 2, 45 + random() * 60);
    }

    // Commute: weekday mornings, and most afternoons
    if (!isWeekend) {
      add('commute', day, 7.75 + random() * 0.5, 35 + random() * 20);
      if (random() < 0.8) add('commute', day, 16.5 + random(), 35 + random() * 25);
    }

    // Sleep: most nights
    if (random() < 0.88) {
      add('sleep', day, 22.5 + random() * 1.25, 6.5 * 60 + random() * 90);
    }
  }

  // Only keep sessions that have already finished
  return sessions.filter((s) => new Date(s.endedAt).getTime() <= now.getTime());
}