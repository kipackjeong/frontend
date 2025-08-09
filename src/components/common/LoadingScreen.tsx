import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { UI_CONFIG } from '../../constants';

interface LoadingScreenProps {
  /** Loading text to display */
  message?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Minimum display time in milliseconds (default: 2000ms) */
  minimumDuration?: number;
  /** Callback when loading is complete and minimum time has elapsed */
  onComplete?: () => void;
  /** Whether the loading process is complete (will wait for minimum duration) */
  isComplete?: boolean;
}

/**
 * Reusable loading screen component with smooth animations and minimum display time
 * 
 * Features:
 * - Configurable loading messages
 * - Minimum display duration to prevent jarring transitions
 * - Smooth fade animations
 * - Consistent styling with app theme
 */
export function LoadingScreen({
  message = "Loading...",
  subtitle,
  minimumDuration = 2000,
  onComplete,
  isComplete = false
}: LoadingScreenProps) {
  const [hasMinimumTimeElapsed, setHasMinimumTimeElapsed] = useState(false);
  const [shouldComplete, setShouldComplete] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const rotateAnim = useState(new Animated.Value(0))[0];

  // Start entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous loading icon rotation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    return () => rotateAnimation.stop();
  }, []);

  // Minimum duration timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMinimumTimeElapsed(true);
    }, minimumDuration);

    return () => clearTimeout(timer);
  }, [minimumDuration]);

  // Check if we should complete (both conditions met)
  useEffect(() => {
    if (isComplete && hasMinimumTimeElapsed && !shouldComplete) {
      setShouldComplete(true);
      
      // Exit animation before calling onComplete
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    }
  }, [isComplete, hasMinimumTimeElapsed, shouldComplete, onComplete]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[UI_CONFIG.COLORS.BACKGROUND, UI_CONFIG.COLORS.SURFACE]}
        style={styles.gradient}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Loading Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ rotate: spin }] },
            ]}
          >
            <Icon
              name="loader"
              size={40}
              color={UI_CONFIG.COLORS.PRIMARY}
            />
          </Animated.View>

          {/* Loading Message */}
          <Text style={styles.message}>{message}</Text>
          
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[UI_CONFIG.COLORS.PRIMARY, UI_CONFIG.COLORS.SECONDARY]}
                style={styles.progressFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.xl,
  },
  iconContainer: {
    marginBottom: UI_CONFIG.SPACING.lg,
    padding: UI_CONFIG.SPACING.md,
    borderRadius: 50,
    backgroundColor: `${UI_CONFIG.COLORS.PRIMARY}15`,
  },
  message: {
    ...UI_CONFIG.TYPOGRAPHY.h3,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: UI_CONFIG.SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...UI_CONFIG.TYPOGRAPHY.body,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: UI_CONFIG.SPACING.lg,
  },
  progressContainer: {
    width: 200,
    marginTop: UI_CONFIG.SPACING.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: `${UI_CONFIG.COLORS.PRIMARY}20`,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
  },
});

export default LoadingScreen;
