import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { PlayerCard } from './PlayerCard';
import { Player } from '../../types';

interface PlayerListProps {
    players: Player[];
    maxPlayers: number;
    minPlayers: number;
}

export function PlayerList({ players, maxPlayers, minPlayers }: PlayerListProps) {
    // Show at least minPlayers slots, but expand up to maxPlayers based on actual players
    // const slotsToShow = Math.max(minPlayers, Math.min(maxPlayers, players.length + 2));
    // const emptySlots = slotsToShow - players.length;

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
                            <Icon name="book-open" size={16} color="#8b4513" />
                            <Text style={styles.statText}> Need {minPlayers - players.length} more to start</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Player cards */}
            <ScrollView style={styles.playersContainer} showsVerticalScrollIndicator={false}>
                {players.map((player, index) => (
                    <View key={player.id} style={{ marginBottom: 12 }}>
                        <PlayerCard player={player} />
                    </View>
                ))}

                {/* Empty slots
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
                ))} */}
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
    statText: {
        color: '#6b5b47',
        fontSize: 14,
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