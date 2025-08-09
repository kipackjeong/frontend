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
    validCells: number;
    totalCells: number;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
    timeLeft,
    formatTime,
    validCells,
    totalCells,
}) => {
    return (
        <View style={styles.compactTimer}>
            <Icon
                name="clock"
                size={14}
                color={timeLeft <= 60 ? '#dc2626' : '#8B4513'}
            />
            <Text style={[
                styles.timerText,
                timeLeft <= 60 && styles.dangerText
            ]}>
                {formatTime(timeLeft)}
            </Text>

            <Text style={styles.progressText}>
                {validCells} / {totalCells}
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
    timerText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8B4513',
        fontFamily: 'monospace',
    },
    dangerText: {
        color: '#dc2626',
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6b7280',
        backgroundColor: '#ffffff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
});

export default TimerDisplay;
