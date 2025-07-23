import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    className?: string;
}

interface CardContentProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

interface CardHeaderProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

interface CardTitleProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export function LobbyCard({ children, style }: CardProps) {
    return (
        <View style={[styles.card, style]}>
            {children}
        </View>
    );
}

export function CardContent({ children, style }: CardContentProps) {
    return (
        <View style={[styles.cardContent, style]}>
            {children}
        </View>
    );
}

export function CardHeader({ children, style }: CardHeaderProps) {
    return (
        <View style={[styles.cardHeader, style]}>
            {children}
        </View>
    );
}

export function CardTitle({ children, style }: CardTitleProps) {
    return (
        <View style={[styles.cardTitle, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(45, 32, 22, 0.08)',
        shadowColor: '#2d2016',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardContent: {
        padding: 16,
    },
    cardHeader: {
        padding: 16,
        paddingBottom: 8,
    },
    cardTitle: {
        // Title styling handled by parent component
    },
});