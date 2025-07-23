import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { PlayerCard } from './PlayerCard';

interface Player {
    id: string;
    name: string;
    avatar?: string;
    isHost: boolean;
    isReady: boolean;
}

interface PlayerListProps {
    players: Player[];
    maxPlayers: number;
}

export function PlayerList({ players, maxPlayers }: PlayerListProps) {
    const emptySlots = maxPlayers - players.length;
    const readyCount = players.filter(p => p.isReady).length;

    return (
        <View style={styles.container}>
            {/* Header with player stats */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View style={styles.titleContainer}>
                        <Icon name="users" size={20} color="#8b4513" />
                        <Text style={styles.title}>Players</Text>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Icon name="check-circle" size={16} color="#22c55e" />
                            <Text style={styles.readyCount}>{readyCount}</Text>
                            <Text style={styles.statText}>ready</Text>
                        </View>

                        <View style={styles.statItem}>
                            <Icon name="book-open" size={16} color="#8b4513" />
                            <Text style={styles.statText}>{players.length}/{maxPlayers} joined</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Player readiness indicator */}
            <View style={styles.readinessSection}>
                <View style={styles.readinessHeader}>
                    <Text style={styles.readinessLabel}>Game Readiness</Text>
                    <Text style={styles.readinessPercentage}>
                        {Math.round((readyCount / players.length) * 100)}%
                    </Text>
                </View>
                <View style={styles.readinessBarContainer}>
                    <LinearGradient
                        colors={['#8b4513', '#228b22']}
                        style={[
                            styles.readinessBar,
                            { width: `${(readyCount / players.length) * 100}%` }
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    />
                </View>
            </View>

            {/* Player cards */}
            <ScrollView style={styles.playersContainer} showsVerticalScrollIndicator={false}>
                {players.map((player, index) => (
                    <View key={player.id} style={{ marginBottom: 12 }}>
                        <PlayerCard player={player} />
                    </View>
                ))}

                {/* Empty slots */}
                {Array.from({ length: emptySlots }).map((_, index) => (
                    <View key={`empty-${index}`} style={styles.emptySlot}>
                        <View style={styles.emptySlotContent}>
                            <View style={styles.addIconContainer}>
                                <Icon name="plus" size={20} color="#8b4513" />
                            </View>
                            <View style={styles.emptySlotText}>
                                <Text style={styles.emptySlotTitle}>
                                    Player {players.length + index + 1}
                                </Text>
                                <Text style={styles.emptySlotSubtitle}>
                                    Waiting to join the word game
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 24,
    },
    header: {
        gap: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        color: '#2d2016',
        fontSize: 18,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    readyCount: {
        color: '#22c55e',
        fontSize: 14,
        fontWeight: '600',
    },
    statText: {
        color: '#6b5b47',
        fontSize: 14,
    },
    readinessSection: {
        gap: 8,
    },
    readinessHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    readinessLabel: {
        color: '#6b5b47',
        fontSize: 14,
    },
    readinessPercentage: {
        color: '#8b4513',
        fontSize: 14,
        fontWeight: '600',
    },
    readinessBarContainer: {
        height: 8,
        backgroundColor: '#f5f1eb',
        borderRadius: 4,
        overflow: 'hidden',
    },
    readinessBar: {
        height: '100%',
        borderRadius: 4,
    },
    playersContainer: {
        maxHeight: 400,
    },
    emptySlot: {
        borderWidth: 2,
        borderColor: 'rgba(45, 32, 22, 0.12)',
        borderStyle: 'dashed',
        borderRadius: 12,
        backgroundColor: 'rgba(245, 241, 235, 0.5)',
        padding: 24,
        marginVertical: 6,
    },
    emptySlotContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    addIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(139, 69, 19, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(139, 69, 19, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptySlotText: {
        alignItems: 'center',
    },
    emptySlotTitle: {
        color: '#2d2016',
        fontSize: 16,
        fontWeight: '600',
    },
    emptySlotSubtitle: {
        color: '#6b5b47',
        fontSize: 12,
        marginTop: 2,
    },
});