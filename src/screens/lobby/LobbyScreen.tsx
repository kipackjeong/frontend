/**
 * Main lobby screen - shows available rooms and navigation options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LobbyScreenNavigationProp } from '../../types/navigation';
import { useUser, useCurrentRoom, useGameActions } from '../../store';
import { socketService } from '../../services';
import { Button, Card } from '../../components/common';
import { UI_CONFIG } from '../../constants';

interface RoomListItem {
  id: string;
  code: string;
  name: string;
  language: 'korean' | 'english';
  max_players: number;
  current_player_count: number;
  creator_username: string;
  created_at: string;
}

export default function LobbyScreen() {
  const navigation = useNavigation<LobbyScreenNavigationProp>();
  const user = useUser();
  const currentRoom = useCurrentRoom();
  const gameActions = useGameActions();
  const rooms = []; // Available rooms will be fetched separately
  const [availableRooms, setAvailableRooms] = useState<RoomListItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAvailableRooms();
    setupSocketListeners();

    return () => {
      // Cleanup socket listeners
      socketService.off('room:list_updated');
    };
  }, []);

  const setupSocketListeners = () => {
    // Listen for real-time room list updates
    socketService.on('room:list_updated', (rooms: RoomListItem[]) => {
      setAvailableRooms(rooms);
    });

    // Subscribe to room list updates
    socketService.emit('room:subscribe_list');
  };

  const loadAvailableRooms = async () => {
    try {
      setIsLoading(true);

      // This would typically call the backend API
      // For now, using socket events as implemented in backend
      socketService.emit('room:get_available', { limit: 20 }, (response: any) => {
        if (response.success) {
          setAvailableRooms(response.data);
        } else {
          Alert.alert('Error', response.message || 'Failed to load rooms');
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Failed to load available rooms:', error);
      Alert.alert('Error', 'Failed to load available rooms');
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAvailableRooms();
    setIsRefreshing(false);
  };

  const handleJoinRoom = (roomCode: string) => {
    socketService.emit('room:join', { code: roomCode }, (response: any) => {
      if (response.success) {
        // Navigate to room screen
        navigation.navigate('RoomScreen' as never);
      } else {
        Alert.alert('Error', response.message || 'Failed to join room');
      }
    });
  };

  const formatLanguage = (language: string) => {
    return language === 'korean' ? '한국어' : 'English';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>초성빙고 Lobby</Text>
        <Text style={styles.subtitle}>Welcome, {user?.username}!</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="Create Room"
          onPress={() => navigation.navigate('CreateRoomScreen' as never)}
          style={styles.createButton}
          variant="primary"
        />
        <Button
          title="Join Room"
          onPress={() => navigation.navigate('JoinRoomScreen' as never)}
          style={styles.joinButton}
          variant="secondary"
        />
      </View>

      {/* Available Rooms */}
      <View style={styles.roomsSection}>
        <Text style={styles.sectionTitle}>Available Rooms</Text>

        <ScrollView
          style={styles.roomsList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[UI_CONFIG.COLORS.PRIMARY]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingCard}>
              <Card variant="elevated" padding="medium">
                <Text style={styles.loadingText}>Loading rooms...</Text>
              </Card>
            </View>
          ) : availableRooms.length === 0 ? (
            <View style={styles.emptyCard}>
              <Card variant="elevated" padding="medium">
                <Text style={styles.emptyText}>No rooms available</Text>
                <Text style={styles.emptySubtext}>Create a room to get started!</Text>
              </Card>
            </View>
          ) : (
            availableRooms.map((room) => (
              <View key={room.id} style={styles.roomCard}>
                <Card variant="elevated" padding="medium" onPress={() => handleJoinRoom(room.code)}>
                  <View style={styles.roomHeader}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.roomCode}>#{room.code}</Text>
                  </View>

                  <View style={styles.roomDetails}>
                    <Text style={styles.roomInfo}>
                      {formatLanguage(room.language)} • {room.current_player_count}/{room.max_players} players
                    </Text>
                    <Text style={styles.roomCreator}>by {room.creator_username}</Text>
                    <Text style={styles.roomTime}>{formatTimeAgo(room.created_at)}</Text>
                  </View>

                  <Button
                    title="Join"
                    onPress={() => handleJoinRoom(room.code)}
                    style={styles.joinRoomButton}
                    variant="primary"
                    disabled={room.current_player_count >= room.max_players}
                  />
                </Card>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND,
    paddingTop: 50, // Status bar padding
  },
  header: {
    paddingHorizontal: UI_CONFIG.SPACING.lg,
    paddingVertical: UI_CONFIG.SPACING.md,
    alignItems: 'center',
  },
  title: {
    ...UI_CONFIG.TYPOGRAPHY.h1,
    color: UI_CONFIG.COLORS.PRIMARY,
    marginBottom: UI_CONFIG.SPACING.xs,
  },
  subtitle: {
    ...UI_CONFIG.TYPOGRAPHY.body,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: UI_CONFIG.SPACING.lg,
    paddingVertical: UI_CONFIG.SPACING.md,
    gap: UI_CONFIG.SPACING.md,
  },
  createButton: {
    flex: 1,
  },
  joinButton: {
    flex: 1,
  },
  roomsSection: {
    flex: 1,
    paddingHorizontal: UI_CONFIG.SPACING.lg,
  },
  sectionTitle: {
    ...UI_CONFIG.TYPOGRAPHY.h2,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: UI_CONFIG.SPACING.md,
  },
  roomsList: {
    flex: 1,
  },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: UI_CONFIG.SPACING.xl,
  },
  loadingText: {
    ...UI_CONFIG.TYPOGRAPHY.body,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: UI_CONFIG.SPACING.xl,
  },
  emptyText: {
    ...UI_CONFIG.TYPOGRAPHY.h3,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: UI_CONFIG.SPACING.xs,
  },
  emptySubtext: {
    ...UI_CONFIG.TYPOGRAPHY.body,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
  },
  roomCard: {
    marginBottom: UI_CONFIG.SPACING.md,
    padding: UI_CONFIG.SPACING.lg,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: UI_CONFIG.SPACING.sm,
  },
  roomName: {
    ...UI_CONFIG.TYPOGRAPHY.h3,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  roomCode: {
    ...UI_CONFIG.TYPOGRAPHY.caption,
    color: UI_CONFIG.COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  roomDetails: {
    marginBottom: UI_CONFIG.SPACING.md,
  },
  roomInfo: {
    ...UI_CONFIG.TYPOGRAPHY.body,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: UI_CONFIG.SPACING.xs,
  },
  roomCreator: {
    ...UI_CONFIG.TYPOGRAPHY.caption,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
  },
  roomTime: {
    ...UI_CONFIG.TYPOGRAPHY.caption,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
  },
  joinRoomButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: UI_CONFIG.SPACING.lg,
  },
});
