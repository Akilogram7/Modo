// The drawing tools available in Scratchpad.
export type DrawingTool = 'pen' | 'eraser';

// A single line drawn by the user.
export type DrawingStroke = {
  d: string;
  tool: DrawingTool;
};

// The actual content stored in a Scratchpad.
export type ScratchpadData = {
  notes: string;
  drawingData: DrawingStroke[];
};

// A saved Scratchpad belonging to a user and mode.
export type SavedScratchpad = ScratchpadData & {
  id: string;
  userId: string;
  modeId: string;
  createdAt: string;
  updatedAt: string;
};

// Starting content for an empty Scratchpad.
export const EMPTY_SCRATCHPAD: ScratchpadData = {
  notes: '',
  drawingData: [],
};