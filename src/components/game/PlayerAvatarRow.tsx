import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
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
                                    {player.isHost && (
                                        <Icon name="award" size={10} color="#fbbf24" />
                                    )}
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
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fbbf24',
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
