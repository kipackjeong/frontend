/**
 * Reusable Input component with validation and error states
 */

import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    KeyboardTypeOptions,
    StyleProp,
} from 'react-native';

interface InputProps {
    // Basic props
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    
    // Advanced props (validation & labels)
    label?: string;
    error?: string;
    secureTextEntry?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    keyboardType?: KeyboardTypeOptions;
    
    // Simple props (backward compatibility)
    placeholderTextColor?: string;
    editable?: boolean;
    numberOfLines?: number;
    textAlign?: 'left' | 'center' | 'right';
    
    // Styling props
    style?: StyleProp<any>;
    textStyle?: StyleProp<TextStyle>;
    
    // Common props
    multiline?: boolean;
    maxLength?: number;
}

const Input: React.FC<InputProps> = ({
    value = '',
    onChangeText,
    placeholder,
    label,
    error,
    secureTextEntry = false,
    autoCapitalize = 'none',
    keyboardType = 'default',
    placeholderTextColor,
    editable = true,
    numberOfLines = 1,
    textAlign = 'left',
    style,
    textStyle,
    multiline = false,
    maxLength,
}) => {
    const [isFocused, setIsFocused] = useState(false);

    const containerStyle = [
        styles.container,
    ];

    const inputStyle = [
        styles.input,
        ...(isFocused ? [styles.inputFocused] : []),
        ...(error ? [styles.inputError] : []),
        ...(multiline ? [styles.inputMultiline] : []),
        textStyle,
    ].filter(Boolean);

    const labelStyle = [
        styles.label,
        ...(error ? [styles.labelError] : []),
    ];

    // If no label and no error, render simple version for backward compatibility
    if (!label && !error) {
        return (
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={placeholderTextColor || '#8E8E93'}
                secureTextEntry={secureTextEntry}
                autoCapitalize={autoCapitalize}
                keyboardType={keyboardType}
                editable={editable}
                multiline={multiline}
                numberOfLines={numberOfLines}
                maxLength={maxLength}
                textAlign={textAlign}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoCorrect={false}
                spellCheck={false}
                style={StyleSheet.flatten([inputStyle, style]) as TextStyle}
            />
        );
    }

    // Render advanced version with labels and validation
    return (
        <View style={StyleSheet.flatten([containerStyle, style])}>
            {label && (
                <Text style={labelStyle}>{label}</Text>
            )}

            <TextInput
                style={StyleSheet.flatten([inputStyle, textStyle]) as TextStyle}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={placeholderTextColor || '#8E8E93'}
                secureTextEntry={secureTextEntry}
                autoCapitalize={autoCapitalize}
                keyboardType={keyboardType}
                editable={editable}
                multiline={multiline}
                numberOfLines={numberOfLines}
                maxLength={maxLength}
                textAlign={textAlign}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoCorrect={false}
                spellCheck={false}
            />

            {error && (
                <Text style={styles.errorText}>{error}</Text>
            )}

            {maxLength && value && (
                <Text style={styles.characterCount}>
                    {value.length}/{maxLength}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },

    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 8,
    },

    labelError: {
        color: '#FF3B30',
    },

    input: {
        borderWidth: 1,
        borderColor: '#D1D1D6',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1C1C1E',
        backgroundColor: '#FFFFFF',
        minHeight: 44,
    },

    inputFocused: {
        borderColor: '#007AFF',
        borderWidth: 2,
    },

    inputError: {
        borderColor: '#FF3B30',
        borderWidth: 2,
    },

    inputMultiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },

    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        marginTop: 4,
        marginLeft: 4,
    },

    characterCount: {
        color: '#8E8E93',
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
});

export default Input;
