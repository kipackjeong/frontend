/**
 * Badge component with support for different variants and text styles
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'text';
type BadgeSize = 'small' | 'medium' | 'large';
type TextVariant = 'primary' | 'secondary' | 'text';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: BadgeSize;
    textVariant?: TextVariant;
    style?: ViewStyle;
    textStyle?: TextStyle;
    gradientColors?: [string, string, ...string[]];
    useGradient?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'primary',
    size = 'medium',
    textVariant = 'primary',
    style,
    textStyle,
    gradientColors,
    useGradient = false,
}) => {
    // Type-safe style mappings for variants
    const variantStyles: Record<BadgeVariant, ViewStyle> = {
        primary: styles.primary,
        secondary: styles.secondary,
        success: styles.success,
        warning: styles.warning,
        error: styles.error,
        info: styles.info,
        text: styles.text,
    };

    // Type-safe style mappings for sizes
    const sizeStyles: Record<BadgeSize, ViewStyle> = {
        small: styles.small,
        medium: styles.medium,
        large: styles.large,
    };

    // Type-safe style mappings for text variants
    const textVariantStyles: Record<TextVariant, TextStyle> = {
        primary: styles.textPrimary,
        secondary: styles.textSecondary,
        text: styles.textText,
    };

    const badgeStyle = [
        styles.badge,
        variantStyles[variant],
        sizeStyles[size],
        style,
    ];

    const badgeTextStyle = [
        styles.badgeText,
        textVariantStyles[textVariant],
        textStyle,
    ];

    if (useGradient && gradientColors) {
        return (
            <LinearGradient
                colors={gradientColors as [string, string, ...string[]]}
                style={badgeStyle}
            >
                <Text style={badgeTextStyle}>{children}</Text>
            </LinearGradient>
        );
    }

    return (
        <View style={badgeStyle}>
            <Text style={badgeTextStyle}>{children}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Size variants
    small: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },

    medium: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },

    large: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },

    // Badge background variants
    primary: {
        backgroundColor: '#007AFF',
    },

    secondary: {
        backgroundColor: '#8E8E93',
    },

    success: {
        backgroundColor: '#34C759',
    },

    warning: {
        backgroundColor: '#FF9500',
    },

    error: {
        backgroundColor: '#FF3B30',
    },

    info: {
        backgroundColor: '#5AC8FA',
    },

    text: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#8E8E93',
    },

    // Text styling
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },

    // Text color variants
    textPrimary: {
        color: '#FFFFFF',
    },

    textSecondary: {
        color: '#F2F2F7',
    },

    textText: {
        color: '#8E8E93',
    },
});

export default Badge;
