import { supabase } from '../../../lib/supabase';

import type {
  ScratchpadData,
  SavedScratchpad,
  DrawingStroke,
} from './scratchpadTypes';

// Get the currently signed-in user's ID.
async function getUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('You must be signed in.');
  }

  return user.id;
}

// Convert a Supabase row into our app's data format.
function toScratchpad(row: any): SavedScratchpad {
  return {
    id: row.id,
    userId: row.user_id,
    modeId: row.mode_id,
    notes: row.notes ?? '',
    drawingData: (row.drawing_data ?? []) as DrawingStroke[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ───────────── LOAD SCRATCHPAD ─────────────

// Get the saved Scratchpad for a specific mode.
export async function loadScratchpad(
  modeId: string
): Promise<SavedScratchpad | null> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('scratchpads')
    .select('*')
    .eq('user_id', userId)
    .eq('mode_id', modeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toScratchpad(data);
}

// ───────────── SAVE SCRATCHPAD ─────────────

// Create a Scratchpad or update an existing one.
export async function saveScratchpad(
  modeId: string,
  content: ScratchpadData
): Promise<SavedScratchpad> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('scratchpads')
    .upsert(
      {
        user_id: userId,
        mode_id: modeId,
        notes: content.notes,
        drawing_data: content.drawingData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,mode_id',
      }
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return toScratchpad(data);
}

// ───────────── DELETE SCRATCHPAD ─────────────

// Delete all saved notes and drawings for one mode.
export async function deleteScratchpad(
  modeId: string
): Promise<void> {
  const userId = await getUserId();

  const { error } = await supabase
    .from('scratchpads')
    .delete()
    .eq('user_id', userId)
    .eq('mode_id', modeId);

  if (error) {
    throw error;
  }
}