import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';

const { width } = Dimensions.get('window');

const CONSONANTS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

interface ConsonantCloudProps {
  height?: number;
  count?: number; // number of floating glyphs
}

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

const ConsonantCloud: React.FC<ConsonantCloudProps> = ({ height = 220, count = 14 }) => {
  const items = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => ({
      id: i,
      ch: CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)],
      left: Math.round(rand(0, width - 24)),
      top: Math.round(rand(0, Math.max(80, height - 24))),
      size: Math.round(rand(14, 28)),
      opacity: rand(0.25, 0.6),
      drift: rand(8, 18),
      duration: Math.round(rand(2500, 4500)),
      delay: Math.round(rand(0, 1200)),
    }));
  }, [count, height]);

  const anims = useRef(items.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((v, idx) => {
      const item = items[idx];
      return Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: item.duration, useNativeDriver: true, delay: item.delay }),
          Animated.timing(v, { toValue: 0, duration: item.duration, useNativeDriver: true }),
        ])
      );
    });
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [anims, items]);

  return (
    <View style={[styles.container, { height }]} pointerEvents="none">
      {items.map((item, idx) => {
        const translateY = anims[idx].interpolate({
          inputRange: [0, 1],
          outputRange: [0, -item.drift],
        });
        const scale = anims[idx].interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
        return (
          <Animated.Text
            key={item.id}
            style={[styles.glyph, {
              left: item.left,
              top: item.top,
              fontSize: item.size,
              opacity: item.opacity,
              transform: [{ translateY }, { scale }],
            }]}
          >
            {item.ch}
          </Animated.Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  glyph: {
    position: 'absolute',
    color: '#6b5b47',
  },
});

export default ConsonantCloud;
