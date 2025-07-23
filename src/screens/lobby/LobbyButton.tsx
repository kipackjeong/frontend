import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ButtonProps {
    children: React.ReactNode;
    onPress?: () => void;
    disabled?: boolean;
    variant?: 'default' | 'outline' | 'secondary';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    style?: ViewStyle;
    textStyle?: TextStyle;
    gradient?: boolean;
    gradientColors?: string[];
}

export const LobbyButton = ({
    children,
    onPress,
    disabled = false,
    variant = 'default',
    size = 'default',
    style,
    textStyle,
    gradient = false,
    gradientColors = ['#8b4513', '#228b22']
}: ButtonProps) => {
    // Type-safe style mappings
    const variantStyles = {
        default: styles.buttonDefault,
        outline: styles.buttonOutline,
        secondary: styles.buttonSecondary,
    };

    const sizeStyles = {
        default: undefined, // No additional styles for default size
        sm: styles.buttonSm,
        lg: styles.buttonLg,
        icon: styles.buttonIcon,
    };

    const textVariantStyles = {
        default: styles.buttonTextDefault,
        outline: styles.buttonTextOutline,
        secondary: styles.buttonTextSecondary,
    };

    const buttonStyles = [
        styles.button,
        variantStyles[variant],
        sizeStyles[size],
        disabled && styles.buttonDisabled,
        style
    ].filter(Boolean);

    const textStyles = [
        styles.buttonText,
        textVariantStyles[variant],
        disabled && styles.buttonTextDisabled,
        textStyle
    ].filter(Boolean);

    if (gradient && !disabled) {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled}
                style={[buttonStyles, { backgroundColor: 'transparent' }]}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={gradientColors as any}
                    style={[StyleSheet.absoluteFill, { borderRadius: 8 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                />
                <Text style={[textStyles, { color: '#ffffff' }]}>{children}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={buttonStyles}
            activeOpacity={0.8}
        >
            <Text style={textStyles}>{children}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    buttonDefault: {
        backgroundColor: '#8b4513',
    },
    buttonOutline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#8b4513',
    },
    buttonSecondary: {
        backgroundColor: '#f5f1eb',
    },
    buttonSm: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    buttonLg: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    buttonIcon: {
        width: 40,
        height: 40,
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
    buttonDisabled: {
        backgroundColor: '#d1d5db',
        borderColor: '#d1d5db',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    buttonTextDefault: {
        color: '#ffffff',
    },
    buttonTextOutline: {
        color: '#8b4513',
    },
    buttonTextSecondary: {
        color: '#2d2016',
    },
    buttonTextDisabled: {
        color: '#6b7280',
    },
});

export default LobbyButton;