import { DEFAULT_ALARM_TIME, formatAlarmTime } from './alarmTime';

// One alarm in a mode. A mode can have a few of these, each with its own title.
export type ModeAlarm = {
  id: string;
  title: string; // optional, like "Gym" or "Take meds"
  time: string; // "HH:MM", 24 hour clock
  enabled: boolean;
};

export const MAX_ALARMS = 5;
export const MAX_ALARM_TITLE = 20;

export function newAlarm(time: string = DEFAULT_ALARM_TIME, title = ''): ModeAlarm {
  return {
    id: `alarm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    time,
    enabled: true,
  };
}

// Reads alarms saved in a mode's settings.
// Also understands the older single-alarm format ({ enabled, time }), so older modes keep working.
export function toAlarmList(saved: any): ModeAlarm[] {
  if (Array.isArray(saved?.alarms)) {
    return saved.alarms
      .filter((a: any) => a && typeof a.time === 'string')
      .slice(0, MAX_ALARMS)
      .map((a: any, i: number) => ({
        id: typeof a.id === 'string' ? a.id : `alarm-${i + 1}`,
        title: typeof a.title === 'string' ? a.title.slice(0, MAX_ALARM_TITLE) : '',
        time: a.time,
        enabled: a.enabled !== false,
      }));
  }
  if (typeof saved?.time === 'string') {
    return [{ id: 'alarm-1', title: '', time: saved.time, enabled: true }];
  }
  return [];
}

// "Alarm at 7:30 AM" for one, "3 alarms" for more
export function alarmsSummary(alarms: ModeAlarm[]): string | null {
  if (alarms.length === 0) return null;
  if (alarms.length === 1) return `Alarm at ${formatAlarmTime(alarms[0].time)}`;
  return `${alarms.length} alarms`;
}

// Sleep mode's alarms, saved on the person's account (user metadata).
// Falls back to the single sleep_alarm_time from before, or one alarm at 8:00 AM.
export function toSleepAlarms(metadata: any): ModeAlarm[] {
  if (Array.isArray(metadata?.sleep_alarms)) {
    return toAlarmList({ alarms: metadata.sleep_alarms });
  }
  const time = typeof metadata?.sleep_alarm_time === 'string' ? metadata.sleep_alarm_time : DEFAULT_ALARM_TIME;
  return [{ id: 'sleep-1', title: '', time, enabled: true }];
}
