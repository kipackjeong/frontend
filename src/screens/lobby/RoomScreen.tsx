/**
 * Room screen - shows current room with players, settings, and ready status
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  Share,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../store';
import { socketService } from '../../services/socket';
import { Button, Card } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';

interface RoomData {
  id: string;
  code: string;
  name: string;
  language: 'korean' | 'english';
  max_players: number;
  status: 'waiting' | 'voting' | 'playing' | 'finished';
  settings: {
    time_per_turn_seconds: number;
    voting_time_seconds: number;
    bingo_pattern_type: string;
  };
  created_at: string;
  creator_id: string;
}

interface Player {
  id: string;
  username: string;
  display_name?: string;
  is_ready: boolean;
  is_creator: boolean;
  joined_at: string;
}

export default function RoomScreen() {
  const navigation = useNavigation();
  const { user } = useStore();
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRoomData();
    setupSocketListeners();

    return () => {
      // Cleanup socket listeners
      socketService.off('room:updated');
      socketService.off('room:player_joined');
      socketService.off('room:player_left');
      socketService.off('room:player_ready_changed');
      socketService.off('room:game_started');
    };
  }, []);

  const setupSocketListeners = () => {
    // Listen for room updates
    socketService.on('room:updated', (data: { room: RoomData; players: Player[] }) => {
      setRoomData(data.room);
      setPlayers(data.players);
      updateCurrentUserReadyStatus(data.players);
    });

    // Listen for player events
    socketService.on('room:player_joined', (player: Player) => {
      setPlayers(prev => [...prev, player]);
    });

    socketService.on('room:player_left', (playerId: string) => {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    });

    socketService.on('room:player_ready_changed', (data: { playerId: string; isReady: boolean }) => {
      setPlayers(prev => prev.map(p =>
        p.id === data.playerId ? { ...p, is_ready: data.isReady } : p
      ));
      if (data.playerId === user?.id) {
        setIsReady(data.isReady);
      }
    });

    // Listen for game start
    socketService.on('room:game_started', () => {
      Alert.alert(
        'Game Starting!',
        'The game is about to begin',
        [
          {
            text: 'Ready!',
            onPress: () => navigation.navigate('VotingScreen' as never),
          },
        ]
      );
    });
  };

  const loadRoomData = () => {
    // Get current room data - this should be stored in global state
    // For now, emit a socket event to get current room
    socketService.emit('room:get_current', (response: any) => {
      if (response.success) {
        setRoomData(response.data.room);
        setPlayers(response.data.players);
        updateCurrentUserReadyStatus(response.data.players);
      } else {
        Alert.alert('Error', 'Failed to load room data');
        navigation.goBack();
      }
      setIsLoading(false);
    });
  };

  const updateCurrentUserReadyStatus = (playerList: Player[]) => {
    const currentPlayer = playerList.find(p => p.id === user?.id);
    if (currentPlayer) {
      setIsReady(currentPlayer.is_ready);
    }
  };

  const handleToggleReady = () => {
    if (!roomData) return;

    socketService.emit('room:toggle_ready', roomData.id, (response: any) => {
      if (!response.success) {
        Alert.alert('Error', response.message || 'Failed to toggle ready status');
      }
    });
  };

  const handleLeaveRoom = () => {
    Alert.alert(
      'Leave Room',
      'Are you sure you want to leave this room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            if (roomData) {
              socketService.emit('room:leave', roomData.id, (response: any) => {
                navigation.navigate('LobbyScreen' as never);
              });
            }
          },
        },
      ]
    );
  };

  const handleShareRoom = async () => {
    if (!roomData) return;

    try {
      await Share.share({
        message: `Join my 초성빙고 game! Room: "${roomData.name}" Code: ${roomData.code}`,
        title: 'Join Choseong Bingo Game',
      });
    } catch (error) {
      console.error('Error sharing room:', error);
    }
  };

  const handleStartGame = () => {
    if (!roomData || !isCreator) return;

    const readyPlayers = players.filter(p => p.is_ready || p.is_creator);
    if (readyPlayers.length < 2) {
      Alert.alert('Cannot Start', 'At least 2 players must be ready to start the game');
      return;
    }

    Alert.alert(
      'Start Game',
      `Start the game with ${readyPlayers.length} players?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            socketService.emit('room:start_game', roomData.id, (response: any) => {
              if (!response.success) {
                Alert.alert('Error', response.message || 'Failed to start game');
              }
            });
          },
        },
      ]
    );
  };

  if (isLoading || !roomData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading room...</Text>
      </View>
    );
  }

  const isCreator = roomData.creator_id === user?.id;
  const readyCount = players.filter(p => p.is_ready || p.is_creator).length;
  const allPlayersReady = readyCount === players.length && players.length >= 2;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>⚙️</Text>
          <Text style={styles.headerTitle}>Game Room</Text>
        </View>
        <TouchableOpacity onPress={handleLeaveRoom} style={styles.leaveButton}>
          <Text style={styles.leaveButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Room Code Card */}
        <View style={styles.roomCodeCard}>
          <Text style={styles.roomCodeLabel}>Room Code</Text>
          <View style={styles.roomCodeContainer}>
            <View style={styles.roomCodeBox}>
              <Text style={styles.roomCodeText}>{roomData.code}</Text>
            </View>
            <TouchableOpacity onPress={handleShareRoom} style={styles.copyButton}>
              <Text style={styles.copyButtonText}>📋</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.shareMessage}>💚 Share this code to invite friends to play</Text>
          <TouchableOpacity onPress={handleShareRoom} style={styles.inviteButton}>
            <Text style={styles.inviteButtonIcon}>🔗</Text>
            <Text style={styles.inviteButtonText}>Invite Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Players Section */}
        <View style={styles.playersCard}>
          <View style={styles.playersHeaderNew}>
            <View style={styles.playersTitle}>
              <Text style={styles.playersTitleIcon}>👥</Text>
              <Text style={styles.playersTitleText}>Players</Text>
            </View>
            <View style={styles.playersCount}>
              <Text style={styles.playersCountReady}>✅ {readyCount} ready</Text>
              <Text style={styles.playersCountTotal}>📊 {players.length}/{roomData.max_players} joined</Text>
            </View>
          </View>

          <View style={styles.readinessBar}>
            <Text style={styles.readinessTitle}>Game Readiness</Text>
            <Text style={styles.readinessPercentage}>{Math.round((readyCount / players.length) * 100)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${(readyCount / players.length) * 100}%` }]} />
          </View>

          {/* Player List */}
          {players.map((player, index) => (
            <View key={player.id} style={styles.playerCardNew}>
              <View style={styles.playerAvatar}>
                <Text style={styles.playerAvatarText}>{player.username.charAt(0).toUpperCase()}</Text>
                <View style={styles.playerLevel}>
                  <Text style={styles.playerLevelText}>{(index + 1) * 10 + Math.floor(Math.random() * 40)}</Text>
                </View>
              </View>
              <View style={styles.playerInfoNew}>
                <View style={styles.playerNameRow}>
                  <Text style={styles.playerNameNew}>{player.username}</Text>
                  {player.is_creator && <Text style={styles.hostBadge}>👑 HOST</Text>}
                </View>
                <View style={styles.playerStatusRow}>
                  <View style={[
                    styles.statusBadge,
                    (player.is_ready || player.is_creator) ? styles.statusBadgeReady : styles.statusBadgeWaiting
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      (player.is_ready || player.is_creator) ? styles.statusBadgeTextReady : styles.statusBadgeTextWaiting
                    ]}>
                      {player.is_creator ? '✅ Ready to Play' :
                        player.is_ready ? '✅ Ready to Play' : '⏳ Thinking...'}
                    </Text>
                  </View>
                  <Text style={styles.playerPoints}>🏆 {(index + 1) * 10 + Math.floor(Math.random() * 50)} pts</Text>
                </View>
                <View style={styles.playerProgressBar}>
                  <View style={[
                    styles.playerProgress,
                    { width: (player.is_ready || player.is_creator) ? '100%' : `${Math.random() * 60 + 20}%` }
                  ]} />
                </View>
              </View>
              <View style={styles.playerStatus}>
                <Text style={styles.playerStatusDot}>
                  {(player.is_ready || player.is_creator) ? '🟢' : '🟡'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Action */}
        <View style={styles.bottomSection}>
          {!allPlayersReady && (
            <View style={styles.needMorePlayersCard}>
              <Text style={styles.needMorePlayersIcon}>👥</Text>
              <Text style={styles.needMorePlayersText}>
                Need {players.length - readyCount} more ready players
              </Text>
            </View>
          )}

          {isCreator ? (
            allPlayersReady ? (
              <TouchableOpacity onPress={handleStartGame} style={styles.startGameButton}>
                <Text style={styles.startGameButtonText}>🚀 Start Game</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.waitingButton}>
                <Text style={styles.waitingButtonIcon}>⏸</Text>
                <Text style={styles.waitingButtonText}>Waiting for Players</Text>
              </View>
            )
          ) : (
            <TouchableOpacity onPress={handleToggleReady} style={[
              styles.readyToggleButton,
              isReady ? styles.readyToggleButtonReady : styles.readyToggleButtonNotReady
            ]}>
              <Text style={[
                styles.readyToggleButtonText,
                { color: isReady ? '#4CAF50' : '#FFFFFF' }
              ]}>
                {isReady ? '✅ Ready to Play' : '⏳ Get Ready'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  leaveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Room Code Card Styles
  roomCodeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  roomCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
    textAlign: 'center',
  },
  roomCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  roomCodeBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  roomCodeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  copyButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: 20,
  },
  shareMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  inviteButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Players Card Styles
  playersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  playersHeaderNew: {
    marginBottom: 16,
  },
  playersTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playersTitleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  playersTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  playersCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  playersCountReady: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  playersCountTotal: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },

  // Progress Bar Styles
  readinessBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  readinessTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  readinessPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },

  // Player Card Styles
  playerCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  playerAvatar: {
    position: 'relative',
    marginRight: 16,
  },
  playerAvatarText: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 48,
  },
  playerLevel: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 20,
  },
  playerLevelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  playerInfoNew: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerNameNew: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginRight: 8,
  },
  hostBadge: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  playerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  statusBadgeReady: {
    backgroundColor: '#E8F5E8',
  },
  statusBadgeWaiting: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusBadgeTextReady: {
    color: '#4CAF50',
  },
  statusBadgeTextWaiting: {
    color: '#FF9800',
  },
  playerPoints: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  playerProgressBar: {
    height: 4,
    backgroundColor: '#E8E8E8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  playerProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  playerStatus: {
    marginLeft: 8,
  },
  playerStatusDot: {
    fontSize: 16,
  },

  // Bottom Section Styles
  bottomSection: {
    paddingBottom: 40,
  },
  needMorePlayersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  needMorePlayersIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  needMorePlayersText: {
    fontSize: 14,
    color: '#F57C00',
    fontWeight: '600',
  },
  startGameButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startGameButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  waitingButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  waitingButtonIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#999999',
  },
  waitingButtonText: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '600',
  },
  readyToggleButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  readyToggleButtonReady: {
    backgroundColor: '#E8F5E8',
  },
  readyToggleButtonNotReady: {
    backgroundColor: '#4CAF50',
  },
  readyToggleButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Legacy styles (keep for compatibility)
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  playersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  readyStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  playerJoinTime: {
    fontSize: 12,
    color: '#666666',
  },
  readyIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
  },
  readyIndicatorReady: {
    backgroundColor: '#E8F5E8',
  },
  readyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
  },
  readyTextReady: {
    color: '#4CAF50',
  },
  actions: {
    paddingVertical: 20,
  },
  actionButton: {
    marginBottom: 12,
  },
  waitingText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
