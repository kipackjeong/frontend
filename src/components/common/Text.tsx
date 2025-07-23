/**
 * Reusable Text component with consistent typography
 */

import React from 'react';
import {
  Text as RNText,
  StyleSheet,
  TextStyle,
  TextProps as RNTextProps,
} from 'react-native';

interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'disabled';
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

const Text: React.FC<TextProps> = ({
  variant = 'body',
  weight = 'regular',
  color = 'primary',
  align = 'left',
  style,
  children,
  ...props
}) => {
  const textStyle: TextStyle[] = [
    styles.base,
    styles[variant],
    styles[`${weight}Weight`],
    styles[`${color}Color`],
    styles[`${align}Align`],
    style,
  ];

  return (
    <RNText style={textStyle} {...props}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    color: '#1C1C1E', // Default primary color
  },
  
  // Variants (sizes)
  h1: {
    fontSize: 32,
    lineHeight: 40,
  },
  
  h2: {
    fontSize: 24,
    lineHeight: 32,
  },
  
  h3: {
    fontSize: 20,
    lineHeight: 28,
  },
  
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
  
  label: {
    fontSize: 12,
    lineHeight: 16,
  },
  
  // Font weights
  lightWeight: {
    fontWeight: '300',
  },
  
  regularWeight: {
    fontWeight: '400',
  },
  
  mediumWeight: {
    fontWeight: '500',
  },
  
  semiboldWeight: {
    fontWeight: '600',
  },
  
  boldWeight: {
    fontWeight: '700',
  },
  
  // Colors
  primaryColor: {
    color: '#1C1C1E',
  },
  
  secondaryColor: {
    color: '#8E8E93',
  },
  
  successColor: {
    color: '#34C759',
  },
  
  warningColor: {
    color: '#FF9500',
  },
  
  errorColor: {
    color: '#FF3B30',
  },
  
  disabledColor: {
    color: '#C7C7CC',
  },
  
  // Text alignment
  leftAlign: {
    textAlign: 'left',
  },
  
  centerAlign: {
    textAlign: 'center',
  },
  
  rightAlign: {
    textAlign: 'right',
  },
});

export default Text;
