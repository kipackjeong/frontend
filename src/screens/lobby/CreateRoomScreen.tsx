import React, { useState } from 'react';
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

} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { PlayerList } from './PlayerList';
import { LobbyCard, CardContent, CardHeader, CardTitle } from './LobbyCard';
import { LobbyButton } from './LobbyButton';
import { Input, Badge } from '../../components/common';

const { width, height } = Dimensions.get('window');

interface Player {
  id: string;
  name: string;
  avatar?: string;
  isHost: boolean;
  isReady: boolean;
}

export function GameLobbyScreen() {
  const [roomCode, setRoomCode] = useState("WORD42");
  const [currentUserId] = useState("user1");

  // Mock player data with friendly names
  const [players] = useState<Player[]>([
    {
      id: "user1",
      name: "WordSmith",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
      isHost: true,
      isReady: true
    },
    {
      id: "user2",
      name: "LetterLover",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&crop=face",
      isHost: false,
      isReady: true
    },
    {
      id: "user3",
      name: "PuzzleMaster",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b2e8f12d?w=100&h=100&fit=crop&crop=face",
      isHost: false,
      isReady: false
    }
  ]);

  const maxPlayers = 6;
  const minPlayers = 2;
  const currentUser = players.find(p => p.id === currentUserId);
  const isHost = currentUser?.isHost || false;
  const canStartGame = players.length >= minPlayers && players.every(p => p.isReady);

  const handleCopyRoomCode = async () => {
    try {
      await Clipboard.setStringAsync(roomCode);
      Alert.alert("Success", "📋 Room code copied to clipboard!");
    } catch (error) {
      Alert.alert("Error", "Failed to copy room code");
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

  const handleStartGame = () => {
    if (canStartGame) {
      Alert.alert("Game Starting", "🎲 Starting the word game...");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#faf8f3', '#f5f1eb']}
        style={styles.backgroundGradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Warm, friendly header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#fef3e0', '#fed7aa']}
                style={styles.iconGradient}
              >
                <Icon name="book-open" size={32} color="#8b4513" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Create Custom Game</Text>

            <Text style={styles.subtitle}>
              Ready for some consonant word fun?
            </Text>
          </View>

          {/* Room settings card */}
          <LobbyCard style={styles.gameCard}>
            <CardHeader>
              <CardTitle>
                <View style={styles.cardTitleContainer}>
                  <View style={styles.settingsIconContainer}>
                    <Icon name="settings" size={20} color="#8b4513" />
                  </View>
                  <Text style={styles.cardTitleText}>Game Room</Text>
                </View>
              </CardTitle>
            </CardHeader>

            <CardContent style={styles.cardContent}>
              <View style={styles.roomCodeSection}>
                <Text style={styles.roomCodeLabel}>Room Code</Text>
                <View style={styles.roomCodeRow}>
                  <View style={styles.inputContainer}>
                    <Input
                      value={roomCode}
                      onChangeText={(text: string) => setRoomCode(text.toUpperCase())}
                      style={styles.roomCodeInput}
                      textStyle={styles.roomCodeInputText}
                      placeholder="ENTER CODE"
                      placeholderTextColor="#6b5b47"
                      editable={isHost}
                      maxLength={8}
                      textAlign="center"
                    />
                  </View>

                  <TouchableOpacity onPress={handleCopyRoomCode} style={styles.copyButton}>
                    <LinearGradient
                      colors={['rgba(139, 69, 19, 0.1)', 'rgba(139, 69, 19, 0.2)']}
                      style={styles.copyButtonGradient}
                    >
                      <Icon name="copy" size={20} color="#8b4513" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {isHost && (
                  <View style={styles.hostMessage}>
                    <Icon name="coffee" size={16} color="#228b22" />
                    <Text style={styles.hostMessageText}>
                      Share this code to invite friends to play
                    </Text>
                  </View>
                )}
              </View>

              <LobbyButton
                onPress={handleInvitePlayers}
                style={styles.inviteButton}
                gradient={true}
                gradientColors={['#8b4513', '#228b22']}
              >
                <Icon name="share-2" size={20} color="#ffffff" />
                <Text style={styles.inviteButtonText}>Invite Friends</Text>
              </LobbyButton>
            </CardContent>
          </LobbyCard>

          {/* Players section */}
          <LobbyCard style={styles.gameCard}>
            <CardContent>
              <PlayerList players={players} maxPlayers={maxPlayers} />
            </CardContent>
          </LobbyCard>

          {/* Game status */}
          <View style={styles.statusContainer}>
            <Badge
              useGradient={true}
              gradientColors={canStartGame
                ? ['#22c55e', '#10b981']
                : ['#f59e0b', '#eab308']
              }
              style={styles.statusBadge}
            >
              <View style={styles.statusContent}>
                <Icon
                  name={canStartGame ? "check-circle" : "users"}
                  size={16}
                  color="#ffffff"
                />
                <Text style={styles.statusText}>
                  {canStartGame
                    ? "Ready to Start!"
                    : `Need ${minPlayers - players.filter(p => p.isReady).length} more ready players`
                  }
                </Text>
              </View>
            </Badge>
          </View>

          {/* Start game button */}
          {isHost && (
            <LobbyButton
              onPress={handleStartGame}
              disabled={!canStartGame}
              style={StyleSheet.flatten([styles.startButton, !canStartGame && styles.disabledButton])}
              gradient={canStartGame}
              gradientColors={['#8b4513', '#228b22']}
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

          {!isHost && (
            <View style={styles.waitingContainer}>
              <View style={styles.loadingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
              <Text style={styles.waitingText}>
                Waiting for the host to start the game...
              </Text>
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
    backgroundColor: '#faf8f3',
  },
  backgroundGradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: 'center',
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 69, 19, 0.2)',
    shadowColor: '#2d2016',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8b4513',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b5b47',
    fontSize: 16,
    textAlign: 'center',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  gameCard: {
    marginVertical: 4,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleText: {
    color: '#8b4513',
    fontSize: 20,
    fontWeight: '600',
  },
  cardContent: {
    gap: 16,
  },
  roomCodeSection: {
    gap: 12,
  },
  roomCodeLabel: {
    color: '#8b4513',
    fontSize: 16,
    fontWeight: '600',
  },
  roomCodeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    height: 48,
  },
  roomCodeInput: {
    backgroundColor: 'rgba(254, 243, 224, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(139, 69, 19, 0.3)',
    borderRadius: 8,
    height: 48,
  },
  roomCodeInputText: {
    color: '#8b4513',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  copyButton: {
    width: 48,
    height: 48,
  },
  copyButtonGradient: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(139, 69, 19, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostMessageText: {
    color: '#6b5b47',
    fontSize: 14,
    flex: 1,
  },
  inviteButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inviteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#2d2016',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  startButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 12,
    shadowColor: '#2d2016',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#d1d5db',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeButtonText: {
    color: '#ffffff',
  },
  disabledButtonText: {
    color: '#6b7280',
  },
  waitingContainer: {
    alignItems: 'center',
    gap: 12,
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
  dot1: {},
  dot2: {},
  dot3: {},
  waitingText: {
    color: '#6b5b47',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default GameLobbyScreen;