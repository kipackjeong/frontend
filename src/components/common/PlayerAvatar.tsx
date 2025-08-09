import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Player } from '../../types';

export type PlayerStatus = 'waiting' | 'in-progress' | 'done' | 'ready';

interface PlayerAvatarProps {
    player: Player
    status?: PlayerStatus;
    size?: 'small' | 'medium' | 'large';
    showScore?: boolean;
    score?: number;
}

export const PlayerAvatar = ({
    player,
    status = 'waiting',
    size = 'medium',
    showScore = false,
    score
}: PlayerAvatarProps) => {
    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return {
                    container: styles.smallContainer,
                    avatar: styles.smallAvatar,
                    text: styles.smallText,
                    scoreBadge: styles.smallScoreBadge,
                    scoreText: styles.smallScoreText
                };
            case 'large':
                return {
                    container: styles.largeContainer,
                    avatar: styles.largeAvatar,
                    text: styles.largeText,
                    scoreBadge: styles.largeScoreBadge,
                    scoreText: styles.largeScoreText
                };
            default: // medium
                return {
                    container: styles.mediumContainer,
                    avatar: styles.mediumAvatar,
                    text: styles.mediumText,
                    scoreBadge: styles.mediumScoreBadge,
                    scoreText: styles.mediumScoreText
                };
        }
    };

    const getStatusBorderColor = () => {
        switch (status) {
            case 'in-progress':
                return '#f59e0b'; // yellow
            case 'done':
            case 'ready':
                return '#22c55e'; // green
            case 'waiting':
            default:
                return '#d1d5db'; // gray
        }
    };

    const sizeStyles = getSizeStyles();
    const borderColor = getStatusBorderColor();
    const displayScore = score || Math.floor(Math.random() * 50) + 10;

    return (
        <View style={[sizeStyles.container, styles.container]}>
            <View style={[
                sizeStyles.avatar,
                styles.avatar,
                { borderColor, borderWidth: status !== 'waiting' ? 3 : 2 }
            ]}>
                {player.avatar ? (
                    <Image
                        source={{ uri: player.avatar }}
                        style={[sizeStyles.avatar, styles.avatarImage]}
                    />
                ) : (
                    <Text style={[sizeStyles.text, styles.avatarText]}>
                        {player.username.slice(0, 2).toUpperCase()}
                    </Text>
                )}
            </View>

            {/* Score badge */}
            {showScore && (
                <LinearGradient
                    colors={['#f59e0b', '#eab308']}
                    style={[sizeStyles.scoreBadge, styles.scoreBadge]}
                >
                    <Text style={[sizeStyles.scoreText, styles.scoreText]}>
                        {displayScore}
                    </Text>
                </LinearGradient>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        borderRadius: 1000, // Perfect circle
        backgroundColor: '#4ade80',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        borderRadius: 1000,
    },
    avatarText: {
        fontWeight: '700',
        color: '#ffffff',
        textAlign: 'center',
    },
    scoreBadge: {
        position: 'absolute',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    scoreText: {
        color: '#ffffff',
        fontWeight: '600',
        textAlign: 'center',
    },

    // Small size styles
    smallContainer: {
        width: 32,
        height: 32,
    },
    smallAvatar: {
        width: 32,
        height: 32,
    },
    smallText: {
        fontSize: 10,
    },
    smallScoreBadge: {
        bottom: -6,
        right: -6,
        minWidth: 16,
        height: 16,
    },
    smallScoreText: {
        fontSize: 8,
    },

    // Medium size styles
    mediumContainer: {
        width: 48,
        height: 48,
    },
    mediumAvatar: {
        width: 48,
        height: 48,
    },
    mediumText: {
        fontSize: 14,
    },
    mediumScoreBadge: {
        bottom: -8,
        right: -8,
        minWidth: 20,
        height: 20,
    },
    mediumScoreText: {
        fontSize: 10,
    },

    // Large size styles
    largeContainer: {
        width: 64,
        height: 64,
    },
    largeAvatar: {
        width: 64,
        height: 64,
    },
    largeText: {
        fontSize: 18,
    },
    largeScoreBadge: {
        bottom: -10,
        right: -10,
        minWidth: 24,
        height: 24,
    },
    largeScoreText: {
        fontSize: 12,
    },
});
