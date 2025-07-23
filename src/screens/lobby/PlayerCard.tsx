import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

interface PlayerCardProps {
    player: {
        id: string;
        name: string;
        avatar?: string;
        isHost: boolean;
        isReady: boolean;
    };
}

export function PlayerCard({ player }: PlayerCardProps) {
    const readyProgress = player.isReady ? 100 : 65;
    const playerScore = Math.floor(Math.random() * 50) + 10;

    return (
        <View style={styles.container}>
            {/* Gentle background for ready players */}
            {player.isReady && (
                <LinearGradient
                    colors={['rgba(34, 197, 94, 0.05)', 'rgba(16, 185, 129, 0.05)']}
                    style={styles.readyBackground}
                />
            )}

            <View style={styles.content}>
                {/* Avatar with score indicator */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        {player.avatar ? (
                            <Image source={{ uri: player.avatar }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarText}>
                                {player.name.slice(0, 2).toUpperCase()}
                            </Text>
                        )}
                    </View>

                    {/* Score badge */}
                    <LinearGradient
                        colors={['#f59e0b', '#eab308']}
                        style={styles.scoreBadge}
                    >
                        <Text style={styles.scoreText}>{playerScore}</Text>
                    </LinearGradient>
                </View>

                {/* Player info */}
                <View style={styles.playerInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.playerName} numberOfLines={1}>
                            {player.name}
                        </Text>
                        {player.isHost && (
                            <View style={styles.hostContainer}>
                                <Icon name="award" size={16} color="#f59e0b" />
                                <View style={styles.hostBadge}>
                                    <Text style={styles.hostText}>HOST</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Status and progress */}
                    <View style={styles.statusContainer}>
                        <View style={styles.statusRow}>
                            <View style={[
                                styles.statusBadge,
                                player.isReady ? styles.readyStatusBadge : styles.waitingStatusBadge
                            ]}>
                                <Icon
                                    name={player.isReady ? "check-circle" : "clock"}
                                    size={12}
                                    color={player.isReady ? "#16a34a" : "#f59e0b"}
                                />
                                <Text style={[
                                    styles.statusText,
                                    player.isReady ? styles.readyStatusText : styles.waitingStatusText
                                ]}>
                                    {player.isReady ? "Ready to Play" : "Thinking..."}
                                </Text>
                            </View>

                            {/* Player stats */}
                            <View style={styles.statsContainer}>
                                <Icon name="book-open" size={12} color="#6b5b47" />
                                <Text style={styles.statsText}>{playerScore} pts</Text>
                            </View>
                        </View>

                        {/* Progress bar */}
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBarBackground}>
                                <LinearGradient
                                    colors={player.isReady ? ['#22c55e', '#10b981'] : ['#f59e0b', '#eab308']}
                                    style={[styles.progressBar, { width: `${readyProgress}%` }]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Status indicator */}
                <View style={[
                    styles.statusIndicator,
                    player.isReady ? styles.readyIndicator : styles.waitingIndicator
                ]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(45, 32, 22, 0.08)',
        padding: 16,
        marginVertical: 6,
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#2d2016',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    readyBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: 'rgba(139, 69, 19, 0.2)',
        backgroundColor: '#fef3e0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 26,
    },
    avatarText: {
        color: '#8b4513',
        fontSize: 18,
        fontWeight: 'bold',
    },
    scoreBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    scoreText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    playerInfo: {
        flex: 1,
        gap: 8,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    playerName: {
        color: '#2d2016',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    hostContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    hostBadge: {
        backgroundColor: '#fef3e0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fed7aa',
    },
    hostText: {
        color: '#f59e0b',
        fontSize: 10,
        fontWeight: '600',
    },
    statusContainer: {
        gap: 8,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    readyStatusBadge: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
    },
    waitingStatusBadge: {
        backgroundColor: '#fffbeb',
        borderColor: '#fed7aa',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    readyStatusText: {
        color: '#16a34a',
    },
    waitingStatusText: {
        color: '#f59e0b',
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statsText: {
        color: '#6b5b47',
        fontSize: 12,
    },
    progressBarContainer: {
        width: '100%',
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: '#f5f1eb',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    readyIndicator: {
        backgroundColor: '#22c55e',
    },
    waitingIndicator: {
        backgroundColor: '#f59e0b',
    },
});