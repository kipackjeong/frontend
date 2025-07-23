/**
 * Reusable Card component for consistent container styling
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { CardProps } from '../../types';

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  onPress,
}) => {
  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[variant],
    styles[`${padding}Padding`],
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },

  // Variants
  default: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
  },

  elevated: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4, // Android shadow
  },

  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },

  // Padding variants
  nonePadding: {
    padding: 0,
  },

  smallPadding: {
    padding: 12,
  },

  mediumPadding: {
    padding: 16,
  },

  largePadding: {
    padding: 24,
  },
});

export default Card;
