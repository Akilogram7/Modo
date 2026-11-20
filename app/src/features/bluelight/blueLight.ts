import { nextAlarmDate, parseAlarmTime, toAlarmTime } from '../alarm/alarmTime';

// The blue light filter's schedule. Times are "HH:MM" on a 24 hour clock, like the alarms,
// and the phone's own clock decides when it's on.

export type BlueLightStrength = 'low' | 'medium' | 'high';

export type BlueLightSettings = {
  enabled: boolean;
  start: string; // when the warm tint turns on, like "21:00"
  end: string; // when it turns off, like "07:00" (the next morning)
  strength: BlueLightStrength;
};

export const DEFAULT_BLUE_LIGHT: BlueLightSettings = {
  enabled: false,
  start: '21:00',
  end: '07:00',
  strength: 'medium',
};

// How see-through the warm tint is for each strength
export const STRENGTHS: { key: BlueLightStrength; label: string; opacity: number }[] = [
  { key: 'low', label: 'Light', opacity: 0.12 },
  { key: 'medium', label: 'Medium', opacity: 0.2 },
  { key: 'high', label: 'Strong', opacity: 0.3 },
];

export const TINT_COLOR = '#FF8A00';

const cleanTime = (time: unknown, fallback: string) => {
  if (typeof time !== 'string') return fallback;
  const { hour, minute } = parseAlarmTime(time);
  return toAlarmTime(hour, minute);
};

// Reads the settings saved on the account (user metadata), filling in anything missing
export function toBlueLightSettings(saved: any): BlueLightSettings {
  return {
    enabled: saved?.enabled === true,
    start: cleanTime(saved?.start, DEFAULT_BLUE_LIGHT.start),
    end: cleanTime(saved?.end, DEFAULT_BLUE_LIGHT.end),
    strength: STRENGTHS.some((s) => s.key === saved?.strength) ? saved.strength : DEFAULT_BLUE_LIGHT.strength,
  };
}

const minutesIntoDay = (time: string) => {
  const { hour, minute } = parseAlarmTime(time);
  return hour * 60 + minute;
};

// Is the tint on at this moment? Works for schedules that go past midnight (9 PM to 7 AM).
export function isFilterOn(settings: BlueLightSettings, now: Date): boolean {
  if (!settings.enabled) return false;
  const start = minutesIntoDay(settings.start);
  const end = minutesIntoDay(settings.end);
  const t = now.getHours() * 60 + now.getMinutes();
  if (start === end) return true; // same start and end = on all day
  return start < end ? t >= start && t < end : t >= start || t < end;
}

// The next time it turns on or off, so the app knows when to check again
export function nextChange(settings: BlueLightSettings, now: Date): Date | null {
  if (!settings.enabled || settings.start === settings.end) return null;
  const on = nextAlarmDate(settings.start, now.getTime());
  const off = nextAlarmDate(settings.end, now.getTime());
  return on < off ? on : off;
}
