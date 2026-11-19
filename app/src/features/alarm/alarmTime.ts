// Alarm times are saved as "HH:MM" on a 24 hour clock, like "07:30" or "22:05".
// The phone's own clock and time zone decide when that is.

export const DEFAULT_ALARM_TIME = '08:00';

export function parseAlarmTime(time: string | null | undefined): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time ?? '');
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) return { hour, minute };
  }
  return parseAlarmTime(DEFAULT_ALARM_TIME);
}

export function toAlarmTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// "07:30" -> "7:30 AM"
export function formatAlarmTime(time: string | null | undefined): string {
  const { hour, minute } = parseAlarmTime(time);
  const period = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

// The next time the clock shows this time: later today, or tomorrow if it already passed
export function nextAlarmDate(time: string | null | undefined, now: number): Date {
  const { hour, minute } = parseAlarmTime(time);
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now) next.setDate(next.getDate() + 1);
  return next;
}

// 27_120_000 -> "7 hours and 32 minutes"
export function timeUntil(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  if (totalMinutes <= 1) return 'less than a minute';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const h = `${hours} hr`;
  const m = `${minutes} min`;

  if (hours === 0) return m;
  if (minutes === 0) return h;
    return `${h} ${m}`;
}
