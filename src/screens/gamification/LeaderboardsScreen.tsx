import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import Text from '../../components/common/Text';
import Button from '../../components/common/Button';
import { UI_CONFIG } from '../../constants/config';
import { playfabService } from '../../services';

interface Item {
  key: string;
  rank: number;
  name: string;
  score: number;
}

const mapEntry = (e: { Position: number; PlayFabId: string; DisplayName?: string; StatValue: number; }): Item => ({
  key: e.PlayFabId,
  rank: e.Position + 1,
  name: e.DisplayName || e.PlayFabId.slice(0, 6),
  score: e.StatValue,
});

const LeaderboardsScreen: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
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
      const res = await playfabService.getLeaderboard('wins', 25);
      if (res.success) {
        setItems((res.items || []).map(mapEntry));
      } else {
        setError(res.message || 'Failed to load leaderboard');
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
      <Card style={styles.card}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.title}>Leaderboards</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <FlatList
            data={items}
            keyExtractor={(it) => it.key}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
            ListEmptyComponent={!loading ? (
              <Text style={styles.emptyText}>No leaderboard data yet.</Text>
            ) : null}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rank}>#{item.rank}</Text>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.score}>{item.score}</Text>
              </View>
            )}
          />

          <View style={styles.actions}>
            <Button onPress={load}>
              Reload
            </Button>
          </View>
        </CardContent>
      </Card>
    </View>
  );
};

export default LeaderboardsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI_CONFIG.COLORS.BACKGROUND, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  card: { },
  actions: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: UI_CONFIG.COLORS.BORDER },
  rank: { width: 40, fontWeight: 'bold', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  name: { flex: 1, color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  score: { width: 60, textAlign: 'right', fontWeight: '600', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  errorText: { color: UI_CONFIG.COLORS.ERROR, marginBottom: 8 },
  emptyText: { color: UI_CONFIG.COLORS.TEXT_SECONDARY },
});
