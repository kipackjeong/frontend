import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedAvatar } from '../common';
import ConsonantCloud from './ConsonantCloud';

interface HomeHeaderProps {
  mood?: 'happy' | 'excited' | 'focused' | 'sleepy' | 'surprised';
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ mood = 'happy' }) => {
  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={["#FFFFFF", "#f5f1eb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <ConsonantCloud height={230} />
        <View style={styles.center}>
          <AnimatedAvatar size="lg" mood={mood} interactive={true} />
          <Text style={styles.title}>초성 빙고</Text>
          <Text style={styles.subtitle}>
            Master 초성 and battle friends in fast, friendly bingo matches.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 16,
    position: 'relative',
  },
  center: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#8b4513',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b5b47',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 24,
  },
});

export default HomeHeader;
