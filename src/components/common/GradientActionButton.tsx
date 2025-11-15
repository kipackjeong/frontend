import React from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

export type GradientTuple = [string, string];

interface GradientActionButtonProps {
  label: string;
  icon: string;
  colors: GradientTuple;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  activeOpacity?: number;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconColor?: string;
  iconSize?: number;
  useGradient?: boolean;
  noShadow?: boolean;
}

const GradientActionButton = ({
  label,
  icon,
  colors,
  onPress,
  disabled,
  style,
  activeOpacity = 0.9,
  contentStyle,
  textStyle,
  iconColor = '#fff',
  iconSize = 18,
  useGradient = true,
  noShadow = false,
}: GradientActionButtonProps) => {
  const appliedColors: GradientTuple = disabled ? ['#9ca3af', '#6b7280'] : colors;

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={onPress}
      disabled={disabled}
      style={StyleSheet.flatten([!noShadow ? styles.btnShadow : null, style])}
    >
      {useGradient ? (
        <LinearGradient
          colors={appliedColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.flatten([styles.btnGrad, contentStyle])}
        >
          <Icon name={icon as any} size={iconSize} color={iconColor} />
          <Text style={StyleSheet.flatten([styles.btnText, textStyle])}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={StyleSheet.flatten([styles.btnNonGrad, contentStyle])}>
          <Icon name={icon as any} size={iconSize} color={iconColor} />
          <Text style={StyleSheet.flatten([styles.btnText, textStyle])}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default GradientActionButton;

const styles = StyleSheet.create({
  btnShadow: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  btnGrad: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnNonGrad: {
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
