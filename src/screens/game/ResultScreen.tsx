import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList } from 'react-native';
import { useStore } from '../../store';

interface DisplayPlayer {
  id: string;
  username: string;
  avatar?: string;
}

const ResultScreen: React.FC = () => {
  const state: any = useStore.getState();
  const players = useStore((s: any) => s.room?.players || s.currentRoom?.players || []);
  const pregamePlayers = useStore((s: any) => s.pregamePlayers || []);
  const lineCountsByPlayerId = useStore((s: any) => s.lineCountsByPlayerId || {});
  const finishOrder = useStore((s: any) => s.finishOrder || []);
  const turnOrder = useStore((s: any) => s.turnOrder || []);

  const allPlayers: DisplayPlayer[] = useMemo(() => {
    let list: any[] = Array.isArray(players) && players.length > 0
      ? players
      : (pregamePlayers || []).map((p: any) => ({ id: p.id, username: p.username, avatar: p.avatar }));

    // Normalize shape
    return (list || []).map((p: any) => ({
      id: p.id,
      username: p.username || p.display_name || `Player-${(p.id || '').slice(0, 4)}`,
      avatar: p.avatar || p.avatar_url,
    }));
  }, [players, pregamePlayers]);

  const orderedPlayers: DisplayPlayer[] = useMemo(() => {
    const byId = new Map<string, DisplayPlayer>();
    for (const p of allPlayers) byId.set(p.id, p);

    const finishedSet = new Set<string>(finishOrder);

    const remaining = allPlayers
      .filter(p => !finishedSet.has(p.id))
      .sort((a, b) => {
        const la = lineCountsByPlayerId[a.id] ?? 0;
        const lb = lineCountsByPlayerId[b.id] ?? 0;
        if (lb !== la) return lb - la; // higher lines first
        const ia = Math.max(0, turnOrder.indexOf(a.id));
        const ib = Math.max(0, turnOrder.indexOf(b.id));
        return ia - ib; // tie-break by turn order
      });

    const orderedIds = [...finishOrder, ...remaining.map(p => p.id)];
    return orderedIds.map(id => byId.get(id)).filter(Boolean) as DisplayPlayer[];
  }, [allPlayers, finishOrder, lineCountsByPlayerId, turnOrder]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={styles.title}>Results</Text>
        <Text style={styles.subtitle}>Final standings</Text>
      </View>

      <FlatList
        data={orderedPlayers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const initial = (item.avatar && item.avatar.trim())
            ? item.avatar
            : (item.username || 'U').charAt(0).toUpperCase();
          const rank = index + 1;
          return (
            <View style={styles.row}>
              <View style={styles.rankPill}><Text style={styles.rankText}>{rank}</Text></View>
              <View style={styles.avatarCircle}><Text style={styles.avatarText}>{initial}</Text></View>
              <View style={styles.info}><Text style={styles.name}>{item.username}</Text></View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#1f2937' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  listContent: { padding: 16, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rankPill: { width: 34, height: 24, borderRadius: 12, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 1, borderColor: '#c7d2fe' },
  rankText: { fontSize: 12, fontWeight: '800', color: '#3730a3' },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#f59e0b', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#374151' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
});

export { ResultScreen };
