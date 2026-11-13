// Shared data shape for modes created by the user.
// timerDuration is stored in SECONDS, matching CreateModeScreen.
export type CustomModeInput = {
  name: string;
  color: string;
  character: number | null;
  timerEnabled: boolean;
  timerDuration: number | null;
};

export type CustomMode = CustomModeInput & { id: string };
