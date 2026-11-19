import type { ModeAlarm } from '../features/alarm/alarmList';

// Shared data shape for modes created by the user.
// timerDuration is stored in SECONDS, matching CreateModeScreen.

export type CustomModeInput = {
  name: string;
  color: string;
  character: number | null;

  timerEnabled: boolean;
  timerDuration: number | null;
  breakMinutes: number | null; // break after each focus round (0 or null = no breaks)

  musicEnabled: boolean;
  playlistUrl: string | null;
  playlistName: string | null;

  weatherEnabled: boolean;

  alarmEnabled: boolean;
  alarms: ModeAlarm[]; // each with its own title and time
};

export type CustomMode = CustomModeInput & { id: string };
