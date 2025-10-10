import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStore } from '../../store';
import type { BingoBoard } from '../../types';
import type { Player, PreGamePlayer } from '../../types';

interface PlayerAvatarRowProps {
    players: Player[];
    playersFromState: PreGamePlayer[];
    currentUserId?: string;
    completedCells: number;
    isCurrentUserReady?: boolean; // Track local ready state
}

const PlayerAvatarRow: React.FC<PlayerAvatarRowProps> = ({
    players,
    playersFromState,
    currentUserId,
    completedCells,
    isCurrentUserReady = false, // Default to false
}) => {
    // Server-authoritative per-user total striked lines
    const lineCountsByPlayerId = useStore((s: any) => s.lineCountsByPlayerId || {});
    const boards: BingoBoard[] = useStore((s: any) => s.boards || []);

    // Fallback: derive live counts from local boards state (marks) to stay in sync instantly
    const localCounts = React.useMemo(() => {
        const out: Record<string, number> = {};
        try {
            const n = 5;
            for (const b of boards) {
                let count = 0;
                // rows
                for (let r = 0; r < n; r++) {
                    let complete = true;
                    for (let c = 0; c < n; c++) { if (!b.cells[r][c].isMarked) { complete = false; break; } }
                    if (complete) count++;
                }
                // cols
                for (let c = 0; c < n; c++) {
                    let complete = true;
                    for (let r = 0; r < n; r++) { if (!b.cells[r][c].isMarked) { complete = false; break; } }
                    if (complete) count++;
                }
                // main diag
                {
                    let complete = true;
                    for (let i = 0; i < n; i++) { if (!b.cells[i][i].isMarked) { complete = false; break; } }
                    if (complete) count++;
                }
                // anti diag
                {
                    let complete = true;
                    for (let i = 0; i < n; i++) { if (!b.cells[i][n - 1 - i].isMarked) { complete = false; break; } }
                    if (complete) count++;
                }
                out[b.playerId] = count;
            }
        } catch {}
        return out;
    }, [boards]);
    // Helper function to get player status with robust logic (avoid flicker/regression)
    const getPlayerStatus = (player: PreGamePlayer | undefined, cellsCompleted?: number, isCurrentUser?: boolean) => {
        const totalCells = 25;
        const completed = cellsCompleted || 0;

        if (isCurrentUser) {
            // Only when the current user confirmed ready
            if (isCurrentUserReady) return 'completed';
        }

        if (!player) {
            // No socket state yet for others; only show progress if we have any completed cells observed
            if (completed > 0) return 'in-progress';
            return 'not-started';
        }

        // Only consider other players completed when BOTH:
        // - player explicitly confirmed ready (isReady)
        // - and we observed 25 completed cells for them
        const confirmedReady = !!player.isReady;
        if (confirmedReady && (player.cellsCompleted ?? 0) >= totalCells) return 'completed';

        if ((player.cellsCompleted ?? 0) > 0 || completed > 0) return 'in-progress';
        return 'not-started';
    };

    // Helper function to get avatar border color based on status
    const getAvatarBorderColor = (status: string) => {
        switch (status) {
            case 'completed': return '#22c55e'; // green
            case 'in-progress': return '#eab308'; // yellow
            case 'not-started': return '#9ca3af'; // grey
            default: return '#9ca3af';
        }
    };

    return (
        <View style={styles.playersSection}>
            <View style={styles.playersAvatarContainer}>
                {players?.map((player, index) => {
                    const playerFromState = playersFromState.find(p => p.id === player.id);
                    const itsMe = player.id === currentUserId;

                    // Use local board progress for current user, socket data for others
                    const cellsCompleted = itsMe
                        ? completedCells // Current user's actual local progress
                        : (playerFromState?.cellsCompleted || 0); // Other players from socket events

                    const status = getPlayerStatus(playerFromState, cellsCompleted, itsMe);
                    const serverCount: number | undefined = lineCountsByPlayerId[player.id];
                    const fallbackCount: number = localCounts[player.id] ?? 0;
                    const lineCount: number = Math.max(
                        typeof serverCount === 'number' ? serverCount : -1,
                        fallbackCount
                    );

                    return (
                        <View key={player.id} style={styles.playerAvatarWrapper}>
                            <View style={[
                                styles.playerAvatar,
                                {
                                    borderColor: getAvatarBorderColor(status),
                                    borderWidth: 3,
                                }
                            ]}>
                                <Text style={styles.avatarText}>
                                    {player.avatar || player.username?.charAt(0)?.toUpperCase() || '👤'}
                                </Text>
                                <View style={styles.hostBadge}>
                                    <Text style={styles.badgeText} numberOfLines={1}>
                                        {lineCount}
                                    </Text>
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
    playersSection: {
        marginBottom: 20,
    },
    playersAvatarContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        flexWrap: 'wrap',
    },
    playerAvatarWrapper: {
        alignItems: 'center',
        minWidth: 60,
    },
    playerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
    },
    hostBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#fef3c7',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fbbf24',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#92400e',
        paddingHorizontal: 0,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    playerName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 6,
        textAlign: 'center',
    },
});

export default PlayerAvatarRow;
