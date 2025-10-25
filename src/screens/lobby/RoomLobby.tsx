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
    BackHandler,
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

    // Lock-down: prevent leaving via hardware back; require explicit leave button
    useFocusEffect(
        React.useCallback(() => {
            const onHardwareBack = () => {
                Alert.alert('Locked In Room', 'Use the top-left leave button to exit this room.');
                return true; // block default
            };
            BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
            return () => {
                BackHandler.removeEventListener('hardwareBackPress', onHardwareBack);
            };
        }, [roomId])
    );

    // Socket.IO: rely on centralized room listeners; only handle voting navigation here
    useEffect(() => {
        if (!roomId) return;

        console.log('🎨 RoomLobby joining channel and listening for voting:started only:', roomId);

        // Ensure this screen receives phase transitions
        socketService.emit('room:join_channel', roomId);

        const handleVotingStarted = (data: { votingSession: any; message?: string }) => {
            navigation.navigate('VotingScreen', {
                roomId,
                votingSession: data.votingSession,
            });
        };

        socketService.on('voting:started', handleVotingStarted);

        return () => {
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
