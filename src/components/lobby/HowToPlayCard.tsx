import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

const Row: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <View style={styles.row}>
    <View style={styles.iconWrap}>
      <LinearGradient colors={["#fef3c7", "#fde68a"]} style={styles.iconGrad}>
        <Icon name={icon as any} size={16} color="#8b4513" />
      </LinearGradient>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowDesc}>{desc}</Text>
    </View>
  </View>
);

const HowToPlayCard: React.FC = () => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>How to Play</Text>
      <Row icon="grid" title="Fill your board" desc="Enter words that start with the chosen consonants." />
      <Row icon="clock" title="Take turns" desc="On your turn, pick a word and mark matching cells." />
      <Row icon="check-circle" title="Get bingo" desc="Complete lines to win!" />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(139,69,19,0.15)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#2d2016', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  iconWrap: { width: 28, height: 28 },
  iconGrad: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fcd34d' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#2d2016' },
  rowDesc: { fontSize: 13, color: '#6b5b47' },
});

export default HowToPlayCard;
