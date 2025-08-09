import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Share,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RoomLobbyScreenNavigationProp } from '../../types/navigation';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { PlayerList } from './PlayerList';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { logger, LogAction } from '../../utils/logger';
import { LobbyButton } from './LobbyButton';
import { Input, Badge } from '../../components/common';
import { useUser, useStore } from '../../store';
import { socketService } from '../../services/socket';

const { width, height } = Dimensions.get('window');

interface Player {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isReady: boolean;
}

interface RoomLobbyParams {
  roomId: string;
  roomCode?: string;
}

type RoomLobbyRouteProp = RouteProp<{ RoomLobby: RoomLobbyParams }, 'RoomLobby'>;

export function RoomLobby() {
  const navigation = useNavigation<RoomLobbyScreenNavigationProp>();
  const route = useRoute<RoomLobbyRouteProp>();
  const user = useUser();

  // Use centralized room store
  const {
    currentRoom,
    setCurrentRoom,
    clearCurrentRoom
  } = useStore();

  // Extract room info from navigation params
  const { roomId, roomCode: initialRoomCode } = route.params;

  // Local loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use centralized room data or fallback to params
  const players = currentRoom?.players || [];
  const roomCode = currentRoom?.code || initialRoomCode || '';
  const currentUserId = user?.id || '';

  // Computed values
  const maxPlayers = 6;
  const minPlayers = 2;
  const isHost = currentRoom?.creator_id === currentUserId;
  const readyPlayers = players.filter(p => p.isReady).length;
  // Host isReady is automatically set to true in backend, so simple logic suffices
  const canStartGame = isHost && players.length >= minPlayers && readyPlayers >= minPlayers;

  // No API polling - using pure event-driven sync via Socket.IO

  // Initialize component - set loading state based on room data availability
  useEffect(() => {
    // If we have room data from the store, we're not loading
    if (currentRoom && currentRoom.id === roomId) {
      setLoading(false);
      setError(null);
      console.log('🎯 RoomLobby initialized with existing room data from store');
    } else if (roomId) {
      // We have a roomId but no room data yet - wait for socket events
      setLoading(true);
      console.log('🎯 RoomLobby initialized, waiting for socket events for room data');

      // Set a timeout to show error if no room data comes in reasonable time
      const timeout = setTimeout(() => {
        if (!currentRoom || currentRoom.id !== roomId) {
          setError('Failed to load room data. The room may not exist.');
          setLoading(false);
        }
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    } else {
      setError('No room ID provided');
      setLoading(false);
    }
  }, [roomId, currentRoom]);

  // Handle cleanup when navigating away from RoomLobby
  useFocusEffect(
    React.useCallback(() => {
      // Component is focused - room data comes from socket events only
      logger.debug(LogAction.NAV_TO_SCREEN, 'RoomLobby focused, socket events will handle room data');

      return () => {
        // 🔧 CRITICAL FIX: Only leave room if navigating AWAY from game flow, not to VotingScreen
        const navigationState = navigation.getState();
        const currentRoute = navigationState.routes[navigationState.index];
        const isNavigatingToVoting = currentRoute.name === 'VotingScreen';

        if (roomId && !isNavigatingToVoting) {
          console.log('😪 [ROOM LEAVE] Leaving room due to navigation away from game flow');
          socketService.emit('room:leave', roomId);
          // Clear room state from store to allow rejoining
          clearCurrentRoom();
        } else if (isNavigatingToVoting) {
          console.log('🎯 [ROOM KEEP] Staying in room for voting - NOT leaving');
          // Don't clear room state when going to voting
        } else {
          console.log('🤔 [ROOM KEEP] No room to leave');
          clearCurrentRoom();
        }
      };
    }, [roomId]) // ✅ Fixed: Only depend on roomId, not currentRoom?.id
  );

  // Socket.IO real-time room event subscriptions
  useEffect(() => {
    if (!roomId) return;

    // Note: No need to emit room:join here since:
    // - Room creators are already added to the room during creation
    // - Room joiners should come from not RoomLobby
    // - Socket will automatically join room channel when needed
    console.log('🎨 RoomLobby initializing socket events for room:', roomId);

    // Subscribe to room events
    const handlePlayerJoined = (data: any) => {
      // Update room state directly from socket event (no API call needed!)
      if (data.updatedRoom) {
        setCurrentRoom({
          ...data.updatedRoom,
          joinedAt: currentRoom?.joinedAt || Date.now()
        });
        // Room data received, stop loading
        setLoading(false);
        setError(null);
        logger.debug(`✅ Room state updated - ${data.player?.name} joined`);
      } else {
        logger.warning('⚠️ [HOST DEBUG] No updatedRoom in event data!');
      }
    };

    const handlePlayerLeft = (data: any) => {
      logger.debug('🔄 Player left room:', data);

      try {
        // ✅ Robust room state management with graceful error handling
        if (data.updatedRoom && data.updatedRoom.players) {
          // Validate that the updated room has proper structure
          const validatedRoom = {
            ...data.updatedRoom,
            joinedAt: currentRoom?.joinedAt || Date.now(),
            players: data.updatedRoom.players.filter((p: any) => p && p.id) // Filter out invalid players
          };

          setCurrentRoom(validatedRoom);
          setLoading(false);
          setError(null);

          const leftPlayerName = data.player?.username || data.player?.display_name || 'A player';
          logger.debug(`✅ Room state gracefully updated - ${leftPlayerName} left, ${validatedRoom.players.length} players remaining`);
        } else if (data.updatedRoom && data.updatedRoom.players?.length === 0) {
          // Room still exists but empty - handle gracefully
          logger.debug('🏠 Room is now empty but still exists');
          setCurrentRoom({
            ...data.updatedRoom,
            joinedAt: currentRoom?.joinedAt || Date.now()
          });
        } else {
          // Room was closed or invalid data
          logger.debug('🏠 Room was closed - navigating to home');
          clearCurrentRoom();
          navigation.navigate('HomeScreen');
        }
      } catch (error) {
        logger.error('⚠️ Error handling player left event:', error);
        // Graceful fallback - don't crash the app
        setError('Failed to update room state');
      }
    };

    const handlePlayerReady = (data: any) => {
      logger.debug('🔄 Player ready status changed:', data);
      // Update room state directly from socket event (no API call needed!)
      if (data.updatedRoom) {
        setCurrentRoom({
          ...data.updatedRoom,
          joinedAt: currentRoom?.joinedAt || Date.now()
        });
        console.log(`✅ Room state updated - player ready status changed`);
      }
    };

    const handleRoomClosed = (data: any) => {
      console.log('🏠 Room was closed:', data);
      Alert.alert(
        'Room Closed',
        data.reason || 'The room has been closed.',
        [
          {
            text: 'OK',
            onPress: () => {
              clearCurrentRoom();
              navigation.navigate('HomeScreen');
            }
          }
        ]
      );
    };

    const handleRoomUpdated = (data: any) => {
      console.log('🔄 Room updated:', data);
      // Update room state directly from socket event (no API call needed!)
      if (data.updatedRoom) {
        setCurrentRoom({
          ...data.updatedRoom,
          joinedAt: currentRoom?.joinedAt || Date.now()
        });
        logger.debug(`✅ Room state updated via room:updated event`);
      } else {
        // No fallback API calls - pure event-driven sync only
        logger.debug('⚠️ No room data in update event - ignoring, waiting for complete socket events');
      }
    };

    const handleVotingStarted = (data: { votingSession: any; message: string }) => {
      // Navigate all players to VotingScreen
      navigation.navigate('VotingScreen', {
        roomId,
        votingSession: data.votingSession
      });
    };

    // ✅ CRITICAL FIX: Join socket room channel so this user receives real-time updates
    socketService.emit('room:join_channel', roomId);

    socketService.on('room:player_joined', handlePlayerJoined);
    socketService.on('room:player_left', handlePlayerLeft);
    socketService.on('room:player_ready_changed', handlePlayerReady);
    socketService.on('room:closed', handleRoomClosed);
    socketService.on('room:updated', handleRoomUpdated);
    socketService.on('voting:started', handleVotingStarted);

    // Cleanup function
    return () => {
      // Leave the room
      socketService.emit('room:leave', roomId);

      // Unsubscribe from events
      socketService.off('room:player_joined', handlePlayerJoined);
      socketService.off('room:player_left', handlePlayerLeft);
      socketService.off('room:player_ready_changed', handlePlayerReady);
      socketService.off('room:closed', handleRoomClosed);
      socketService.off('room:updated', handleRoomUpdated);
      socketService.off('voting:started', handleVotingStarted);
    };
  }, [roomId]);

  const handleCopyRoomCode = async () => {
    try {
      await Clipboard.setStringAsync(roomCode);
      Alert.alert('Copied!', `Room code "${roomCode}" copied to clipboard`);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      Alert.alert('Error', 'Failed to copy room code');
    }
  };

  const handleInvitePlayers = async () => {
    try {
      await Share.share({
        title: "📚 Join our Word Game!",
        message: `Come play a fun word game with us! Room code: ${roomCode}`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleToggleReady = async () => {
    try {
      // Use enhanced backend socket event for ready status toggle
      socketService.emit('room:toggle_ready', roomId, (response: any) => {
        if (!response.success) {
          console.error('Failed to toggle ready status:', response.message);
          Alert.alert('Error', response.message || 'Failed to update ready status');
        }
        // No need to update local state - the backend will send room:player_ready_changed event
        // with complete updated room state, which our socket handler will process
      });
    } catch (error) {
      console.error('Failed to toggle ready status:', error);
      Alert.alert('Error', 'Failed to update ready status');
    }
  };

  const handleStartGame = async () => {
    if (!canStartGame) return;

    try {
      // Start voting phase
      socketService.emit('room:start_voting', roomId, (response: any) => {
        if (response.success) {
          console.log('Voting started successfully:', response.votingSession);
          // Navigate to VotingScreen
          navigation.navigate('VotingScreen', {
            roomId,
            votingSession: response.votingSession
          });
        } else {
          console.error('Failed to start voting:', response.message);
          Alert.alert('Error', response.message || 'Failed to start voting');
        }
      });
    } catch (error) {
      console.error('Failed to start voting:', error);
      Alert.alert('Error', 'Failed to start voting');
    }
  };

  const handleLeaveRoom = () => {
    Alert.alert(
      "Leave Room?",
      "Are you sure you want to leave this room?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              // Emit leave room event
              socketService.emit('room:leave', roomId);

              // Clear current room from centralized store
              clearCurrentRoom();

              navigation.navigate('HomeScreen');
            } catch (error) {
              console.error('Failed to leave room:', error);

              // Still clear room state even if socket call fails
              clearCurrentRoom();

              navigation.navigate('HomeScreen');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#FFFFFF', '#f5f1eb']}
          style={styles.backgroundGradient}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b4513" />
            <Text style={styles.loadingText}>Loading room...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#FFFFFF', '#f5f1eb']}
          style={styles.backgroundGradient}
        >
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <LobbyButton onPress={() => navigation.navigate('HomeScreen')}>
              Return to Home
            </LobbyButton>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#f5f1eb']}
        style={styles.backgroundGradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with back button and host/guest indicator */}
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleLeaveRoom}
            >
              <Icon name="arrow-left" size={24} color="#8b4513" />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>
                {'시작해볼까?'}
              </Text>
            </View>
          </View>

          {/* Room Code Section - Ultra Compact */}
          <View style={styles.compactRoomSection}>
            <Text style={styles.roomCodeLabelUltra}>Room Code</Text>
            <View style={styles.roomCodeRowUltra}>
              <Input
                value={roomCode}
                onChangeText={() => { }} // Room code is read-only (generated by backend)
                style={styles.roomCodeInputUltra}
                placeholder="CODE"
                placeholderTextColor="#6b5b47"
                editable={false}
                maxLength={8}
              />

              <TouchableOpacity onPress={handleCopyRoomCode} style={styles.copyButton}>
                <Icon name="copy" size={24} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleInvitePlayers} style={styles.copyButton}>
                <Icon name="share-2" size={24} color="#228b22" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Players section */}
          <Card style={styles.gameCard}>
            <CardContent>
              <PlayerList players={players} maxPlayers={maxPlayers} minPlayers={minPlayers} />
            </CardContent>
          </Card>

          {/* Host controls */}
          {isHost && (
            <LobbyButton
              onPress={handleStartGame}
              disabled={!canStartGame}
              style={{
                ...styles.startButton,
                ...(!canStartGame && styles.disabledButton)
              }}
            >
              <Icon
                name="play"
                size={20}
                color={canStartGame ? "#ffffff" : "#6b7280"}
              />
              <Text style={[
                styles.startButtonText,
                canStartGame ? styles.activeButtonText : styles.disabledButtonText
              ]}>
                {canStartGame ? "Start Word Game" : "Waiting for Players"}
              </Text>
            </LobbyButton>
          )}

          {/* Guest controls */}
          {!isHost && (
            <View style={styles.guestControls}>
              <LobbyButton
                onPress={handleToggleReady}
                style={{
                  ...styles.readyButton,
                  ...(players.find(p => p.id === currentUserId)?.isReady
                    ? styles.readyButtonActive
                    : styles.readyButtonInactive)
                }}
                gradient={true}
                gradientColors={['#8b4513', '#228b22']}
              >
                <Text style={styles.readyButtonText}>
                  {players.find(p => p.id === currentUserId)?.isReady ? "Ready!" : "Get Ready"}
                </Text>
              </LobbyButton>

              <View style={styles.waitingContainer}>
                <Text style={styles.waitingText}>
                  Waiting for host to start the game...
                </Text>
                <View style={styles.loadingDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundGradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8b4513',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    shadowColor: '#8b4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1,
  },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b4513',
    textAlign: 'center',
  },
  hostBadge: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  guestBadge: {
    backgroundColor: '#6b7280',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  roleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gameCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#8b4513',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    padding: 24,
  },
  roomCodeSection: {
    marginBottom: 20,
  },
  roomCodeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8b4513',
    marginBottom: 8,
    textAlign: 'center',
  },
  roomCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  roomCodeInput: {
    borderWidth: 2,
    borderColor: '#d4b896',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#faf8f3',
  },
  copyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  copyButtonGradient: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.2)',
  },
  inviteButton: {
    backgroundColor: '#228b22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  inviteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#8b4513',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeButtonText: {
    color: '#ffffff',
  },
  disabledButtonText: {
    color: '#6b7280',
  },
  guestControls: {
    gap: 16,
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  readyButtonActive: {
    backgroundColor: '#10b981',
  },
  readyButtonInactive: {
    backgroundColor: '#8b4513',
  },
  readyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  waitingText: {
    fontSize: 14,
    color: '#6b5b47',
    textAlign: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8b4513',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  // Ultra-compact styles
  compactRoomSection: {
    padding: 8,
  },
  roomCodeLabelUltra: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8b4513',
    marginBottom: 4,
  },
  roomCodeRowUltra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomCodeInputUltra: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#ffffff',
  },
  inviteButtonUltra: {
    backgroundColor: '#228b22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    minWidth: 60,
  }
});

export default RoomLobby;
