import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface Player {
    id: string;
    username: string;
    isHost: boolean;
    isReady?: boolean;
    boardCompleted: boolean;
}

interface PlayerProgressListProps {
    players: Player[];
    currentUserId?: string;
    size?: string;
    showScores?: boolean;
    horizontal?: boolean;
}

/**
 * Minimal PlayerProgressList component showing only player badges with status colors and labels.
 */
const PlayerProgressList = ({ players }: PlayerProgressListProps) => {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playersList}
        >
            {players.map((player) => {
                const status = player.boardCompleted ? 'done' : player.isReady ? 'in-progress' : 'waiting';
                const statusColor = status === 'done' ? '#10b981' : status === 'in-progress' ? '#f59e0b' : '#6b7280';
                const statusLabel = status === 'done' ? 'DONE' : status === 'in-progress' ? 'FILLING' : 'WAITING';

                return (
                    <View key={player.id} style={styles.playerBadge}>
                        <Text style={styles.statusLabel}>{statusLabel}</Text>
                        <View style={[styles.avatarContainer, { borderColor: statusColor }]}>
                            <Text style={styles.avatarText}>
                                {player.username.slice(0, 2).toUpperCase()}
                            </Text>
                            {player.isHost && (
                                <View style={styles.hostIndicator}>
                                    <Text style={styles.crownIcon}>👑</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.playerName}>{player.username}</Text>
                    </View>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    playersList: {
        paddingHorizontal: 16,
        gap: 16,
    },
    playerBadge: {
        alignItems: 'center',
        marginRight: 4,
    },
    statusLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f3f4f6',
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: 6,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
    },
    hostIndicator: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#fef3c7',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#f59e0b',
    },
    crownIcon: {
        fontSize: 10,
    },
    playerName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
        textAlign: 'center',
        maxWidth: 60,
    },
});

export default PlayerProgressList;
