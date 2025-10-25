import React from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface TimerDisplayProps {
    timeLeft: number;
    formatTime: (seconds: number) => string;
    size?: 'compact' | 'large';
    muted?: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
    timeLeft,
    formatTime,
    size = 'compact',
    muted = false,
}) => {

    const isLarge = size === 'large';
    const clockSize = isLarge ? 20 : 14;
    const isMuted = !!muted;
    return (
        <View style={StyleSheet.flatten([
            styles.compactTimer,
            isLarge && styles.compactTimerLarge,
            isMuted && styles.mutedTimer,
        ])}>
            <Icon
                name="clock"
                size={clockSize}
                color={isMuted ? '#9ca3af' : (timeLeft <= 60 ? '#dc2626' : '#8B4513')}
            />
            <Text style={StyleSheet.flatten([
                styles.timerText,
                !isMuted && timeLeft <= 60 && styles.dangerText,
                isLarge && styles.timerTextLarge,
                isMuted && styles.timerTextMuted,
            ])}>
                {formatTime(timeLeft)}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    compactTimer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f9fafb',
        borderRadius: 20,
        marginBottom: 16,
        alignSelf: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    compactTimerLarge: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        gap: 10,
    },
    timerText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8B4513',
        fontFamily: 'monospace',
    },
    timerTextLarge: {
        fontSize: 26,
    },
    dangerText: {
        color: '#dc2626',
    },
    mutedTimer: {
        backgroundColor: '#f3f4f6',
        borderColor: '#e5e7eb',
        opacity: 0.95,
    },
    timerTextMuted: {
        color: '#9ca3af',
    },
});

export default TimerDisplay;
