import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { UI_CONFIG } from '../../constants/config';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../store';
import { socketService } from '../../services/socket';

interface DisplayPlayer {
  id: string;
  username: string;
  avatar?: string;
}

const ResultScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const state: any = useStore.getState();
  const players = useStore((s: any) => s.room?.players || s.currentRoom?.players || []);
  const pregamePlayers = useStore((s: any) => s.pregamePlayers || []);
  const lineCountsByPlayerId = useStore((s: any) => s.lineCountsByPlayerId || {});
  const finishOrder = useStore((s: any) => s.finishOrder || []);
  const turnOrder = useStore((s: any) => s.turnOrder || []);
  const roomId = useStore((s: any) => s.currentRoom?.id);
  const { clearCurrentRoom } = useStore();

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
          const lines = (lineCountsByPlayerId as Record<string, number>)[item.id] ?? 0;
          return (
            <View style={styles.row}>
              <View style={styles.rankPill}><Text style={styles.rankText}>{rank}</Text></View>
              <View style={styles.avatarCircle}><Text style={styles.avatarText}>{initial}</Text></View>
              <View style={styles.info}><Text style={styles.name}>{item.username}</Text></View>
              <View style={styles.linesWrap}><Text style={styles.linesText}>{lines}</Text><Text style={styles.linesUnit}>lines</Text></View>
            </View>
          );
        }}
        ListFooterComponent={() => (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.leaveButton}
              activeOpacity={0.8}
              onPress={() => {
                try { if (roomId) socketService.emit('room:leave', roomId); } catch { }
                try { (clearCurrentRoom as any)?.(); } catch { }
                navigation.navigate('HomeScreen' as never);
              }}
            >
              <Text style={styles.leaveButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI_CONFIG.COLORS.BACKGROUND },
  headerWrap: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: UI_CONFIG.TYPOGRAPHY.h2.fontSize, fontWeight: UI_CONFIG.TYPOGRAPHY.h2.fontWeight, color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  subtitle: { fontSize: UI_CONFIG.TYPOGRAPHY.small.fontSize, color: UI_CONFIG.COLORS.TEXT_SECONDARY, marginTop: 4 },
  listContent: { padding: 16, paddingTop: 8, backgroundColor: UI_CONFIG.COLORS.BACKGROUND },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: UI_CONFIG.COLORS.BORDER },
  rankPill: { width: 34, height: 24, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 10, borderWidth: 1, borderColor: UI_CONFIG.COLORS.BORDER },
  rankText: { fontSize: 12, fontWeight: '800', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: UI_CONFIG.COLORS.SURFACE, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: UI_CONFIG.COLORS.BORDER, marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '800', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: UI_CONFIG.TYPOGRAPHY.body.fontSize, fontWeight: '700', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  linesWrap: { flexDirection: 'row', alignItems: 'flex-end' },
  linesText: { fontSize: 16, fontWeight: '800', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  linesUnit: { fontSize: 12, color: UI_CONFIG.COLORS.TEXT_SECONDARY, marginLeft: 4 },
  footer: { paddingHorizontal: 16, paddingVertical: 16 },
  leaveButton: { backgroundColor: '#8b4513', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  leaveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});

export { ResultScreen };
