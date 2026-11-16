// Shared data shape for modes created by the user.
// timerDuration is stored in SECONDS, matching CreateModeScreen.
export type CustomModeInput = {
  name: string;
  color: string;
  character: number | null;
  timerEnabled: boolean;
  timerDuration: number | null;
  musicEnabled: boolean;
  playlistUrl: string | null;
  playlistName: string | null;
};

export type CustomMode = CustomModeInput & { id: string };
