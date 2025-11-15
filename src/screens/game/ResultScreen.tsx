import React, { useMemo, useEffect, useState, useRef } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { UI_CONFIG } from '../../constants/config';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../store';
import { socketService } from '../../services/socket';
import ConfettiOverlay from '../../components/animations/ConfettiOverlay';
import { Card, CardContent } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { GradientActionButton } from '../../components/common';

interface DisplayPlayer {
  id: string;
  username: string;
  avatar?: string;
}

const ResultScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const players = useStore((s: any) => s.room?.players || s.currentRoom?.players || []);
  const pregamePlayers = useStore((s: any) => s.pregamePlayers || []);
  const lineCountsByPlayerId = useStore((s: any) => s.lineCountsByPlayerId || {});
  const finishOrder = useStore((s: any) => s.finishOrder || []);
  const turnOrder = useStore((s: any) => s.turnOrder || []);
  const roomId = useStore((s: any) => s.currentRoom?.id);
  const currentUserId = useStore((s: any) => s.user?.id);
  const { clearCurrentRoom } = useStore();
  const [showConfetti, setShowConfetti] = useState(true);
  const [visiblePlayers, setVisiblePlayers] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 2500);

    // Animate entry
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true })
    ]).start();

    // Stagger player reveal
    setVisiblePlayers(0);
    const total = Math.max(orderedPlayers.length, 0);
    const timeouts: NodeJS.Timeout[] = [];
    for (let i = 0; i < total; i++) {
      timeouts.push(setTimeout(() => setVisiblePlayers((prev) => Math.min(prev + 1, total)), 400 + i * 120));
    }

    return () => {
      clearTimeout(t);
      timeouts.forEach(clearTimeout);
    };
  }, []);

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

  // Derived current user details
  const currentUser = useMemo(() => orderedPlayers.find(p => p.id === currentUserId), [orderedPlayers, currentUserId]);
  const currentUserRank = useMemo(() => {
    const idx = orderedPlayers.findIndex(p => p.id === currentUserId);
    return idx >= 0 ? idx + 1 : undefined;
  }, [orderedPlayers, currentUserId]);
  const isWinner = currentUserRank === 1;
  const currentUserLines = currentUser ? (lineCountsByPlayerId as Record<string, number>)[currentUser.id] ?? 0 : 0;

  // Helpers for visuals (no semantic changes)
  const getMedalColor = (rank: number): [string, string] => {
    switch (rank) {
      case 1:
        return ['#fbbf24', '#f59e0b'] as [string, string];
      case 2:
        return ['#d1d5db', '#9ca3af'] as [string, string];
      case 3:
        return ['#d97706', '#b45309'] as [string, string];
      default:
        return ['#f5f1eb', '#e5e1d8'] as [string, string];
    }
  };

  const getPodiumHeight = (rank: number): number => {
    switch (rank) {
      case 1:
        return 140;
      case 2:
        return 110;
      case 3:
        return 90;
      default:
        return 80;
    }
  };

  const handleLeave = () => {
    try { if (roomId) socketService.emit('room:leave', roomId); } catch { }
    try { (clearCurrentRoom as any)?.(); } catch { }
    navigation.navigate('HomeScreen' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ConfettiOverlay visible={showConfetti} onFinish={() => setShowConfetti(false)} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.victoryBadgeContainer}>
              <Icon name={isWinner ? 'award' : 'star'} size={64} color={isWinner ? '#eab308' : '#3b82f6'} />
            </View>
            <View style={styles.resultMessage}>
              <Text style={styles.title}>{isWinner ? '🎉 Victory!' : currentUserRank && currentUserRank <= 3 ? '🌟 Well Done!' : '💪 Good Game!'}</Text>
              <Text style={styles.subtitle}>Final standings</Text>
            </View>
          </View>

          {/* Leaderboard */}
          <View style={styles.leaderboardSection}>
            {/* Full list */}
            <View style={styles.playersList}>
              {orderedPlayers.map((item, index) => {
                const rank = index + 1;
                const lines = (lineCountsByPlayerId as Record<string, number>)[item.id] ?? 0;
                const isCurrent = item.id === currentUserId;
                const isVisible = index < visiblePlayers;
                return (
                  <View key={item.id} style={[styles.playerCardWrapper, { opacity: isVisible ? 1 : 0 }]}>
                    <Card style={StyleSheet.flatten([styles.playerCard, isCurrent && styles.playerCardCurrent])}>
                      <CardContent style={styles.playerContent}>
                        {/* Rank */}
                        <View style={styles.rankContainer}>
                          {rank <= 3 ? (
                            <LinearGradient colors={getMedalColor(rank)} style={styles.medalBadge}>
                              <Icon name="award" size={rank === 1 ? 22 : 18} color={rank === 1 ? '#92400e' : rank === 2 ? '#6b7280' : '#78350f'} />
                            </LinearGradient>
                          ) : (
                            <View style={[styles.rankBadge, isCurrent && styles.rankBadgeCurrent]}>
                              <Text style={[styles.rankNumber, isCurrent && styles.rankNumberCurrent]}>{rank}</Text>
                            </View>
                          )}
                        </View>

                        {/* Avatar */}
                        <View style={styles.playerAvatar}>
                          <View style={styles.avatarSmall}>
                            <Text style={styles.avatarTextSmall}>{(item.username || 'U').slice(0, 2).toUpperCase()}</Text>
                          </View>
                        </View>

                        {/* Info */}
                        <View style={styles.playerInfo}>
                          <View style={styles.playerNameRow}>
                            <Text style={styles.playerName} numberOfLines={1}>{item.username}</Text>
                            {isCurrent && (
                              <Badge style={styles.youBadge} textStyle={styles.youBadgeText}>You</Badge>
                            )}
                          </View>
                          <View style={styles.playerStats}>
                            <Text style={styles.playerStatsText}>{lines} lines</Text>
                          </View>
                        </View>

                        {/* Score */}
                        <View style={styles.scoreContainer}>
                          <Text style={styles.scoreValue}>{lines}</Text>
                          <Text style={styles.scoreLabel}>points</Text>
                        </View>
                      </CardContent>
                    </Card>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <GradientActionButton
              label="다시하기"
              icon="plus"
              colors={['#059669', '#047857']}
              onPress={handleLeave}
              style={styles.playAgainButton}
            />

            <GradientActionButton
              label="Back to Home"
              icon="home"
              colors={[UI_CONFIG.COLORS.SURFACE, UI_CONFIG.COLORS.SURFACE] as [string, string]}
              onPress={handleLeave}
              useGradient={false}
              noShadow={true}
              style={styles.homeButton}
              textStyle={styles.homeButtonText}
              iconColor="#8b4513"
            />
          </View>

          {/* Achievement banner */}
          {isWinner && (
            <Card style={styles.achievementCard}>
              <CardContent style={styles.achievementContent}>
                <LinearGradient colors={['#fef3c7', '#fde68a'] as [string, string]} style={styles.achievementIcon}>
                  <Icon name="award" size={32} color="#92400e" />
                </LinearGradient>
                <View style={styles.achievementText}>
                  <Text style={styles.achievementTitle}>Victory Streak!</Text>
                  <Text style={styles.achievementDescription}>You're on fire! Keep up the amazing work!</Text>
                </View>
                <Badge style={styles.xpBadge} textStyle={styles.xpBadgeText}>+100 XP</Badge>
              </CardContent>
            </Card>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI_CONFIG.COLORS.BACKGROUND },
  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  contentContainer: {},

  // Header
  headerSection: { alignItems: 'center', marginTop: 8, marginBottom: 12 },
  victoryBadgeContainer: { width: 96, height: 96, borderRadius: 48, backgroundColor: UI_CONFIG.COLORS.SURFACE, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: UI_CONFIG.COLORS.BORDER },
  resultMessage: { alignItems: 'center', marginTop: 12 },
  title: { fontSize: UI_CONFIG.TYPOGRAPHY.h2.fontSize, fontWeight: UI_CONFIG.TYPOGRAPHY.h2.fontWeight, color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  subtitle: { fontSize: UI_CONFIG.TYPOGRAPHY.small.fontSize, color: UI_CONFIG.COLORS.TEXT_SECONDARY, marginTop: 4 },

  // Stats
  statsCard: { marginTop: 12 },
  statsContent: { paddingVertical: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, alignItems: 'center' },
  statIconContainer: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '700', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  statLabel: { fontSize: UI_CONFIG.TYPOGRAPHY.small.fontSize, color: UI_CONFIG.COLORS.TEXT_SECONDARY },

  // Leaderboard
  leaderboardSection: { marginTop: 16 },
  leaderboardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 as any, marginBottom: 12 },
  leaderboardTitle: { marginLeft: 8, fontSize: UI_CONFIG.TYPOGRAPHY.h3.fontSize, fontWeight: UI_CONFIG.TYPOGRAPHY.h3.fontWeight, color: UI_CONFIG.COLORS.TEXT_PRIMARY },

  // Podium
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: UI_CONFIG.COLORS.BORDER },
  avatarGold: { backgroundColor: '#FEF3C7' },
  avatarSilver: { backgroundColor: '#F3F4F6' },
  avatarBronze: { backgroundColor: '#FEE2E2' },
  avatarText: { fontSize: 16, fontWeight: '800', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  crownIcon: { position: 'absolute', top: -24 },
  // Players list
  playersList: { marginTop: 8 },
  playerCardWrapper: { marginBottom: 10 },
  playerCard: {},
  playerCardCurrent: { borderWidth: 2, borderColor: UI_CONFIG.COLORS.INFO },
  playerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 as any },
  rankContainer: { width: 48, alignItems: 'center', justifyContent: 'center' },
  medalBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: UI_CONFIG.COLORS.SURFACE, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: UI_CONFIG.COLORS.BORDER },
  rankBadgeCurrent: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  rankNumber: { fontSize: 14, fontWeight: '700', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  rankNumberCurrent: { color: '#2563EB' },
  playerAvatar: { width: 54, alignItems: 'center' },
  avatarSmall: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: UI_CONFIG.COLORS.SURFACE, borderWidth: 1, borderColor: UI_CONFIG.COLORS.BORDER },
  avatarTextSmall: { fontSize: 14, fontWeight: '700', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  playerInfo: { flex: 1 },
  playerNameRow: { flexDirection: 'row', alignItems: 'center' },
  playerName: { fontSize: UI_CONFIG.TYPOGRAPHY.body.fontSize, fontWeight: '700', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  youBadge: { marginLeft: 8 },
  youBadgeText: { fontWeight: '700' },
  playerStats: { marginTop: 4 },
  playerStatsText: { fontSize: UI_CONFIG.TYPOGRAPHY.small.fontSize, color: UI_CONFIG.COLORS.TEXT_SECONDARY },
  scoreContainer: { width: 56, alignItems: 'flex-end' },
  scoreValue: { fontSize: 18, fontWeight: '800', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  scoreLabel: { fontSize: 12, color: UI_CONFIG.COLORS.TEXT_SECONDARY },

  // Actions
  actionsSection: { marginTop: 20, paddingHorizontal: 16 },
  playAgainButton: { borderRadius: 12, paddingVertical: 14 },
  homeButton: { borderRadius: 12, borderWidth: 1, borderColor: UI_CONFIG.COLORS.BORDER, paddingVertical: 14 },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },
  homeButtonText: { fontSize: 16, fontWeight: '700', color: '#8b4513' },

  // Achievement
  achievementCard: { marginTop: 16 },
  achievementContent: { flexDirection: 'row', alignItems: 'center', gap: 12 as any },
  achievementIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  achievementText: { flex: 1 },
  achievementTitle: { fontSize: UI_CONFIG.TYPOGRAPHY.body.fontSize, fontWeight: '700', color: UI_CONFIG.COLORS.TEXT_PRIMARY },
  achievementDescription: { fontSize: UI_CONFIG.TYPOGRAPHY.small.fontSize, color: UI_CONFIG.COLORS.TEXT_SECONDARY },
  xpBadge: {},
  xpBadgeText: { fontWeight: '700' },
});

export { ResultScreen };
