import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStore } from '../../store';
import type { BingoBoard, Player, PreGamePlayer } from '../../types';

interface PreGameAvatarRowProps {
  players: Player[];
  playersFromState: PreGamePlayer[];
  currentUserId?: string;
  completedCells: number;
  isCurrentUserReady?: boolean;
}

const PreGameAvatarRow: React.FC<PreGameAvatarRowProps> = ({
  players,
  playersFromState,
  currentUserId,
  completedCells,
  isCurrentUserReady = false,
}) => {
  const boards: BingoBoard[] = useStore((s: any) => s.boards || []);

  const getPlayerStatus = (player: PreGamePlayer | undefined, cellsCompleted?: number, isCurrentUser?: boolean) => {
    const totalCells = 25;
    const completed = cellsCompleted || 0;

    if (isCurrentUser) {
      if (isCurrentUserReady) return 'completed';
    }
    if (!player) {
      if (completed > 0) return 'in-progress';
      return 'not-started';
    }
    const confirmedReady = !!player.isReady;
    if (confirmedReady && (player.cellsCompleted ?? 0) >= totalCells) return 'completed';
    if ((player.cellsCompleted ?? 0) > 0 || completed > 0) return 'in-progress';
    return 'not-started';
  };

  const getAvatarBorderColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'in-progress': return '#eab308';
      case 'not-started': return '#9ca3af';
      default: return '#9ca3af';
    }
  };

  return (
    <View style={styles.playersSection}>
      <View style={styles.playersAvatarContainer}>
        {players?.map((player) => {
          const playerFromState = playersFromState.find(p => p.id === player.id || p.username === player.username);
          const pid = (player as any).playerId ?? player.id;
          const itsMe = pid === currentUserId || player.id === currentUserId;

          const cells = itsMe ? completedCells : (playerFromState?.cellsCompleted || 0);
          const status = getPlayerStatus(playerFromState, cells, itsMe);

          return (
            <View key={player.id} style={styles.playerAvatarWrapper}>
              <View style={[styles.playerAvatar, { borderColor: getAvatarBorderColor(status), borderWidth: 3 }]}>
                <Text style={styles.avatarText}>
                  {player.avatar || player.username?.charAt(0)?.toUpperCase() || '👤'}
                </Text>
                <View style={styles.hostBadge}>
                  <Text style={styles.badgeText} numberOfLines={1}>{cells}</Text>
                </View>
              </View>
              <Text style={styles.playerName}>{itsMe ? 'You' : player.username}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  playersSection: { marginBottom: 24 },
  playersAvatarContainer: { flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  playerAvatarWrapper: { alignItems: 'center', minWidth: 60 },
  playerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#374151' },
  hostBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#fef3c7', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fbbf24' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#92400e', paddingHorizontal: 0, includeFontPadding: false, textAlignVertical: 'center' },
  playerName: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginTop: 6, textAlign: 'center' },
});

export default PreGameAvatarRow;
