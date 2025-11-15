import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import Text from '../../components/common/Text';
import { UI_CONFIG } from '../../constants/config';
import { playfabService } from '../../services';

interface StatItem {
  key: string;
  label: string;
  value: number;
}

const KNOWN_STATS: Record<string, string> = {
  wins: 'Total Wins',
  streak: 'Win Streak',
  xp: 'Total XP',
  level: 'Player Level',
  fastestBingoSeconds: 'Fastest Bingo (s)'
};

const AchievementsScreen: React.FC = () => {
  const [items, setItems] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    if (!playfabService.isConfigured()) {
      setItems([]);
      setError('PlayFab not configured. Set EXPO_PUBLIC_PLAYFAB_TITLE_ID.');
      return;
    }
    if (!playfabService.hasSession()) {
      setError('Not logged in to PlayFab yet.');
      return;
    }

    setLoading(true);
    try {
      const res = await playfabService.getPlayerStatistics(Object.keys(KNOWN_STATS));
      if (res.success) {
        const data = res.stats || {};
        const mapped: StatItem[] = Object.keys(KNOWN_STATS).map(k => ({
          key: k,
          label: KNOWN_STATS[k],
          value: data[k] ?? 0,
        }));
        setItems(mapped);
      } else {
        setError(res.message || 'Failed to load achievements');
      }
    } catch (e: any) {
      setError(e?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <Card>
        <CardHeader>
          <CardTitle>
            <Text style={styles.title}>Achievements & Stats</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <FlatList
            data={items}
            keyExtractor={(it) => it.key}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
            ListEmptyComponent={!loading ? (
              <Text style={styles.emptyText}>No stats yet.</Text>
            ) : null}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.name}>{item.label}</Text>
                <Text style={styles.value}>{item.value}</Text>
              </View>
            )}
          />
        </CardContent>
      </Card>
    </View>
  );
};

export default AchievementsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI_CONFIG.COLORS.BACKGROUND, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: UI_CONFIG.COLORS.BORDER },
  name: { flex: 1, color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  value: { width: 80, textAlign: 'right', fontWeight: '700', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  errorText: { color: UI_CONFIG.COLORS.ERROR, marginBottom: 8 },
  emptyText: { color: UI_CONFIG.COLORS.TEXT_SECONDARY },
});
