import { supabase } from '../../lib/supabase';
import type { CustomMode } from '../types/mode';
import { toCustomMode } from './customModes';

// Sharing modes with friends.
// The database side lives in supabase/mode_groups.sql. The app never touches the
// sharing tables directly, it only calls the functions from that file.

// One of YOUR modes that you are sharing
export type HostedShare = {
  groupId: string;
  code: string; // the 6 character code friends type in
  members: string[]; // names of the friends who joined
};

// A friend's mode that you joined with a code
export type JoinedMode = {
  groupId: string;
  hostName: string;
  mode: CustomMode; // always the host's latest settings
  runningForSeconds: number | null; // how long ago the host started it (null = not running)
};

export type ModeGroups = {
  hosted: Record<string, HostedShare>; // look up by mode id
  joined: JoinedMode[];
};

export const NO_GROUPS: ModeGroups = { hosted: {}, joined: [] };

// Exactly what get_mode_groups() in the database gives back
export type GroupRow = {
  group_id: string;
  role: 'host' | 'member';
  code: string | null;
  host_name: string;
  members: string[];
  running_for_seconds: number | null;
  mode: any;
};

// A host's start counts for this long. After that we assume they forgot to end the mode.
const RUNNING_LIMIT_SECONDS = 4 * 60 * 60;

export async function fetchGroupRows(): Promise<GroupRow[]> {
  const { data, error } = await supabase.rpc('get_mode_groups');
  if (error) throw new Error(error.message);
  return (data ?? []) as GroupRow[];
}

// Sorts the rows into "modes I share" and "modes I joined"
export function toModeGroups(rows: GroupRow[]): ModeGroups {
  const groups: ModeGroups = { hosted: {}, joined: [] };

  for (const row of rows) {
    if (row.role === 'host') {
      groups.hosted[row.mode.id] = {
        groupId: row.group_id,
        code: row.code ?? '',
        members: row.members ?? [],
      };
    } else {
      groups.joined.push({
        groupId: row.group_id,
        hostName: row.host_name,
        mode: toCustomMode(row.mode),
        runningForSeconds: isRunning(row) ? row.running_for_seconds : null,
      });
    }
  }

  return groups;
}

function isRunning(row: GroupRow) {
  return row.running_for_seconds !== null && row.running_for_seconds < RUNNING_LIMIT_SECONDS;
}

// A short description of the rows, used to tell if anything changed since the last check.
// (The running time goes up every second, so it only counts as "on" or "off" here.)
export function groupsSignature(rows: GroupRow[]): string {
  return JSON.stringify(rows.map((row) => ({ ...row, running_for_seconds: isRunning(row) })));
}

// Finds joined modes that the host started since we last looked.
// `lastStarts` remembers when each one was last started, so each start is only reported once.
// It gets updated by this function.
export function findNewHostStarts(
  rows: GroupRow[],
  lastStarts: Record<string, number>,
  nowMs: number = Date.now(),
): GroupRow[] {
  const started: GroupRow[] = [];

  for (const row of rows) {
    if (row.role !== 'member' || row.running_for_seconds === null || !isRunning(row)) continue;

    const startedAtMs = nowMs - row.running_for_seconds * 1000;
    const last = lastStarts[row.group_id];

    // More than a few seconds after the start we already knew about = a new start
    if (last === undefined || startedAtMs - last > 5000) {
      lastStarts[row.group_id] = startedAtMs;
      started.push(row);
    }
  }

  return started;
}

// HOST: start sharing a mode. Gives back the code (the same one if it's already shared).
export async function shareMode(modeId: string): Promise<string> {
  const { data, error } = await supabase.rpc('share_mode', { p_mode_id: modeId });
  if (error) throw new Error(error.message);
  return data as string;
}

// HOST: stop sharing. Friends who joined lose the mode.
export async function stopSharingMode(modeId: string): Promise<void> {
  const { error } = await supabase.rpc('stop_sharing_mode', { p_mode_id: modeId });
  if (error) throw new Error(error.message);
}

// FRIEND: join with a code. The error message says what went wrong (like a wrong code).
export async function joinModeGroup(code: string): Promise<void> {
  const { error } = await supabase.rpc('join_mode_group', { p_code: code });
  if (error) throw new Error(error.message);
}

// FRIEND: leave a mode you joined
export async function leaveModeGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_mode_group', { p_group_id: groupId });
  if (error) throw new Error(error.message);
}

// HOST: tell friends a shared mode started (running = true) or that it ended (false).
// When ending, modeId can be null, which just ends whatever was running.
export async function setGroupModeRunning(modeId: string | null, running: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_group_mode_running', {
    p_mode_id: modeId,
    p_running: running,
  });
  // Don't stop the mode from working just because friends couldn't be told
  if (error) console.warn('Could not update the shared mode:', error.message);
}
