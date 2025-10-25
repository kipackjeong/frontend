import type { Room as ApiRoom } from '../types/api';
import type { CurrentRoom } from '../store/slices/roomSlice';

/**
 * Normalize backend/socket Room payloads to the store's CurrentRoom shape.
 * Falls back gracefully if some fields are missing.
 */
export const toCurrentRoom = (room: Partial<ApiRoom> & Record<string, any>, fallbackCreatorId?: string): CurrentRoom => {
  const players = Array.isArray(room?.players) ? room.players.map((p: any) => ({
    id: p?.id || '',
    username: p?.username || p?.name || '',
    isHost: !!(p?.isHost || p?.host),
    isReady: !!(p?.isReady || p?.ready),
    avatar: p?.avatar ?? p?.profilePicture ?? '',
    boardCompleted: !!p?.boardCompleted,
  })) : [];

  // Map status to store's smaller enum
  const status: CurrentRoom['status'] = ((): CurrentRoom['status'] => {
    const raw = (room as any)?.status;
    if (raw === 'playing') return 'playing';
    if (raw === 'finished') return 'finished';
    return 'waiting';
  })();

  const creatorId = (room as any)?.creator_id
    || (room as any)?.hostId
    || players.find((p) => p.isHost)?.id
    || fallbackCreatorId
    || '';

  const maxPlayers = (room as any)?.max_players
    ?? (room as any)?.maxPlayers
    ?? Math.max(players.length, 1);

  return {
    id: (room as any)?.id || '',
    name: (room as any)?.name || '',
    code: (room as any)?.code || '',
    creator_id: creatorId,
    max_players: maxPlayers,
    status,
    players,
    joinedAt: Date.now(),
  } as CurrentRoom;
};
