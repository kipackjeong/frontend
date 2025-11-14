import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
    Dimensions,
    BackHandler,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { Card, CardContent } from '../../components/common';
import { VotingScreenNavigationProp, RootStackParamList } from '../../types/navigation';
import { socketService } from '../../services/socket';
import { useUser, useStore } from '../../store';
import { logger, LogAction } from '../../utils/logger';

const { width, height } = Dimensions.get('window');

interface ConsonantPair {
    id: string;
    pair: string;
    votes: number;
    description: string;
}

interface VotingSession {
    room_id: string;
    consonant_options: ConsonantPair[];
    votes: any[];
    voting_started_at: string;
    voting_duration: number;
    total_players: number; // Total players in room for accurate percentage calculations
    selected_consonant?: string;
    status: 'active' | 'completed';
}

type VotingScreenRouteProp = RouteProp<RootStackParamList, 'VotingScreen'>;

export function VotingScreen() {
    const navigation = useNavigation<VotingScreenNavigationProp>();
    const route = useRoute<VotingScreenRouteProp>();
    const user = useUser();
    const { currentRoom } = useStore();

    const { roomId, votingSession: initialVotingSession } = route.params;

    // Real voting state from backend
    const [votingSession, setVotingSession] = useState<VotingSession>(initialVotingSession);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [timeLeft, setTimeLeft] = useState(500); // 15 seconds voting time TODO: revert this back to 15 after testing

    const consonantPairs = votingSession.consonant_options;

    // Check if current user has already voted and sync selection
    useEffect(() => {
        if (user?.id && votingSession.votes) {
            const userVote = votingSession.votes.find(vote => vote.player_id === user.id);
            if (userVote) {
                setHasVoted(true);
                setSelectedOption(userVote.consonant_id);
            } else {
                // User hasn't voted yet, reset hasVoted state
                setHasVoted(false);
                setSelectedOption(null);
            }
        }
    }, [user?.id, votingSession.votes]);

    const totalVotes = consonantPairs.reduce((sum, pair) => sum + pair.votes, 0);
    const totalPlayers = votingSession.total_players; // Reliable player count from backend VotingSession

    // 🔍 DEBUG: Track vote count changes for live sync debugging
    useEffect(() => {
        console.log('📈 [LIVE SYNC] Vote counts changed:', {
            totalVotes,
            totalPlayers,
            consonantVotes: consonantPairs.map(pair => `${pair.pair}: ${pair.votes}`),
            votingSessionVotes: votingSession.votes.length,
            timestamp: new Date().toISOString()
        });
    }, [totalVotes, totalPlayers, consonantPairs, votingSession.votes.length]);

    // 🔍 DEBUG: Check player count sources
    useEffect(() => {
    }, [votingSession.total_players, currentRoom?.players?.length, totalVotes, roomId]);

    // Socket event listeners for real-time voting updates
    useEffect(() => {
        const handleVotingUpdate = (data: { votingSession: VotingSession }) => {
            setVotingSession(data.votingSession);

            // Sync current user's vote state in real-time
            if (user?.id && data.votingSession.votes) {
                const userVote = data.votingSession.votes.find(vote => vote.player_id === user.id);
                if (userVote) {
                    setHasVoted(true);
                    setSelectedOption(userVote.consonant_id);
                    logger.debug(LogAction.DEBUG_TEST, `🎯 User ${user.id} vote synced: ${userVote.consonant_id}`);
                } else {
                    setHasVoted(false);
                    setSelectedOption(null);
                    logger.debug(LogAction.DEBUG_TEST, `🎯 User ${user.id} vote cleared`);
                }
            }
        };

        const handleVotingCompleted = (data: { votingSession: VotingSession; selectedConsonant: string }) => {
            logger.debug(`📥 [SOCKET_EVENT_RECEIVE] voting:completed received by user ${user?.id}:`, data);

            // 🔍 DEBUG: Check room state before navigation
            logger.debug(`🏠 [PRE_NAV_DEBUG] Room state before navigation:`, {
                roomExists: !!currentRoom,
                roomId: currentRoom?.id,
                roomCode: currentRoom?.code,
                playerCount: currentRoom?.players?.length || 0,
                players: currentRoom?.players?.map(p => ({ id: p.id, username: p.username })),
                navigationRoomId: roomId,
                roomMatch: roomId === currentRoom?.id
            });

            setVotingSession(data.votingSession);

            // Navigate to PreGameBoardScreen with animation + room data to prevent state loss
            logger.debug(`🚀 [NAVIGATION] Navigating to PreGameBoardScreen with:`, {
                roomId: roomId,
                winnerConsonant: data.selectedConsonant,
                currentRoomStillExists: !!currentRoom,
                passingRoomData: !!currentRoom
            });

            navigation.navigate('PreGameBoardScreen', {
                roomId: roomId,
                winnerConsonant: data.selectedConsonant,
                roomData: currentRoom || undefined // Pass room data to prevent state loss during navigation
            });
        };

        // 🔌 Join socket room channel for live voting updates
        logger.debug(LogAction.SOCKET_JOIN_ROOM, `User ${user?.id} joining room channel: room:${roomId}`);
        logger.debug(LogAction.SOCKET_CONNECT, `Socket connected: ${socketService.isConnected()}`);
        logger.debug(LogAction.DEBUG_TEST, `Exact roomId being used: "${roomId}" (type: ${typeof roomId})`);
        logger.debug(LogAction.DEBUG_TEST, `Route params: ${JSON.stringify(route.params)}`);
        logger.debug(LogAction.DEBUG_TEST, `VotingSession room_id: "${votingSession.room_id}" (type: ${typeof votingSession.room_id})`);

        // Verify room IDs match
        if (roomId !== votingSession.room_id) {
            console.error(`⚠️ [ROOM MISMATCH] Route roomId (${roomId}) !== votingSession.room_id (${votingSession.room_id})`);
        }

        // 🔧 CRITICAL FIX: Ensure user joins socket room with callback verification
        console.log(`🔌 [VOTING FIX] Attempting to join socket room: room:${roomId}`);

        socketService.emit('room:join_channel', roomId, (response: any) => {
            if (response?.success) {
                console.log(`✅ [VOTING FIX] Successfully joined socket room: room:${roomId}`);
            } else {
                console.error(`❌ [VOTING FIX] Failed to join socket room:`, response);
            }
        });

        // 🔄 BACKUP: Try joining again after a delay to ensure it works
        setTimeout(() => {
            console.log(`🔄 [VOTING FIX] Backup room join attempt for: room:${roomId}`);
            socketService.emit('room:join_channel', roomId);
        }, 500);

        // 🏓 PING TEST: Verify basic socket communication works
        console.log('🧪 [PING TEST] Testing basic socket communication for user:', user?.id);

        const pingTestListener = (data: any) => {
            console.log('✅ [PING TEST] User received ping response:', data, 'User ID:', user?.id);
        };

        socketService.on('ping-response', pingTestListener);

        // Send ping test
        setTimeout(() => {
            socketService.emit('ping-test', { userId: user?.id, roomId, timestamp: Date.now() });
            console.log('📤 [PING TEST] Sent ping test for user:', user?.id);
        }, 1000);

        // Listen for any event containing 'voting'
        socketService.on('voting:vote_updated', handleVotingUpdate);
        socketService.on('voting:completed', handleVotingCompleted);

        // 🔧 TEST: Register a direct listener to see if socketService.on() works at all
        const testDirectListener = (data: any) => {
            console.log('✨ [DIRECT TEST] Direct voting event received!', data, 'User:', user?.id);
        };

        socketService.on('voting:vote_updated', testDirectListener);

        // Test socket connection with a ping
        setTimeout(() => {
            console.log(`🏓 [VOTING SOCKET] Testing socket after 1s - connected: ${socketService.isConnected()}`);
        }, 1000);

        return () => {
            socketService.off('voting:vote_updated', handleVotingUpdate);
            socketService.off('voting:completed', handleVotingCompleted);

            // Clean up test direct listener
            socketService.off('voting:vote_updated', testDirectListener);

            // Clean up ping test listener
            socketService.off('ping-response', pingTestListener);

            logger.debug(`🔌 [VOTING SOCKET] Left room channel: room:${roomId}`);
        };
    }, [navigation]);

    // Lock-down: only leave via explicit button; block hardware back
    useFocusEffect(
        React.useCallback(() => {
            const onBack = () => {
                Alert.alert('Locked In Room', 'Use the top-right leave button to exit this room.');
                return true; // prevent default back behavior
            };
            BackHandler.addEventListener('hardwareBackPress', onBack);
            return () => BackHandler.removeEventListener('hardwareBackPress', onBack);
        }, [roomId])
    );

    const handleLeaveRoom = () => {
        Alert.alert(
            'Leave Room?',
            'Are you sure you want to leave this room?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: () => {
                        try { socketService.emit('room:leave', roomId); } catch { }
                        try { useStore.getState().clearCurrentRoom?.(); } catch { }
                        navigation.navigate('HomeScreen');
                    }
                }
            ]
        );
    };

    // Countdown timer - always run if voting is active
    useEffect(() => {
        if (timeLeft > 0 && votingSession.status === 'active') {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft, votingSession.status]);

    const handleVote = async (pairId: string) => {
        if (votingSession.status !== 'active' || timeLeft === 0) return;

        logger.debug(LogAction.VOTING_SUBMIT, `User ${user?.id} attempting to vote for ${pairId}`);
        logger.debug(LogAction.SOCKET_CONNECT, `Socket connected: ${socketService.isConnected()}`);

        setSelectedOption(pairId);

        // Submit vote immediately (users can change vote anytime)
        if (!user?.id) {
            console.error('❌ [VOTING FRONTEND] No user ID available');
            return;
        }

        setIsConfirming(true);

        const voteData = {
            roomId,
            consonantId: pairId
        };

        console.log(`📤 [VOTING FRONTEND] Emitting vote submission:`, voteData);

        // Submit vote to backend
        socketService.emit('voting:submit_vote', voteData, (response: any) => {
            console.log(`📥 [VOTING FRONTEND] Vote response received:`, response);
            setIsConfirming(false);

            if (response?.success) {
                console.log('✅ [VOTING FRONTEND] Vote submitted successfully');
                // Don't set hasVoted=true, allow changing votes
                // Don't show success alert - remove notification panel
                setVotingSession(response.votingSession);
            } else {
                console.error('❌ [VOTING FRONTEND] Vote submission failed:', response?.message);
                Alert.alert('Error', response?.message || 'Failed to submit vote');
                setSelectedOption(null); // Reset selection on error
            }
        });
    };

    const getVotePercentage = (votes: number) => {
        if (totalVotes === 0) return 0;
        return Math.round((votes / totalVotes) * 100);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#FFFFFF', '#f5f1eb']}
                style={styles.backgroundGradient}
            >
                {/* Absolute overlay close button */}
                <View pointerEvents="box-none" style={styles.topOverlay}>
                    <TouchableOpacity
                        onPress={handleLeaveRoom}
                        style={styles.leaveButton}
                        activeOpacity={0.8}
                        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                    >
                        <Icon name="x" size={20} color="#FF4444" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    

                    {/* Header with countdown timer */}
                    <View style={styles.headerSection}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>초성 고르기</Text>
                            <Text style={styles.subtitle}>
                            </Text>
                        </View>

                        {/* Countdown Timer */}
                        <Card style={styles.timerCard}>
                            <CardContent style={styles.timerContent}>
                                <View style={styles.timerRow}>
                                    <View style={[
                                        styles.timerIconContainer,
                                        timeLeft <= 10 ? styles.timerIconDanger : styles.timerIconNormal
                                    ]}>
                                        <Icon
                                            name="clock"
                                            size={16}
                                            color={timeLeft <= 10 ? '#dc2626' : '#f59e0b'}
                                        />
                                    </View>

                                    <View style={styles.timerTextContainer}>
                                        <Text style={[
                                            styles.timerText,
                                            timeLeft <= 10 ? styles.timerTextDanger : styles.timerTextNormal
                                        ]}>
                                            {formatTime(timeLeft)}
                                        </Text>
                                        <Text style={styles.timerLabel}>Time remaining</Text>
                                    </View>

                                    <View style={[
                                        styles.timerDot,
                                        timeLeft <= 10 ? styles.timerDotDanger : styles.timerDotNormal
                                    ]} />
                                </View>
                            </CardContent>
                        </Card>

                        {/* Vote Progress Overview */}
                        <View style={styles.progressOverview}>
                            <View style={styles.progressItem}>
                                <Icon name="users" size={14} color="#8b4513" />
                                <Text style={styles.progressText}>
                                    <Text style={styles.progressNumber}>{totalVotes}/{totalPlayers}</Text>
                                    <Text style={styles.progressLabel}> voted</Text>
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Modern Compact Consonant Options */}
                    <View style={styles.modernOptionsSection}>
                        <View style={styles.modernOptionsGrid}>
                            {consonantPairs.map((pair, index) => {
                                const isSelected = selectedOption === pair.id;
                                const votePercentage = getVotePercentage(pair.votes);

                                return (
                                    <TouchableOpacity
                                        key={pair.id}
                                        onPress={() => handleVote(pair.id)}
                                        disabled={timeLeft === 0}
                                        style={[
                                            styles.modernOptionCard,
                                            isSelected && styles.modernOptionCardSelected
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        {/* Selection indicator */}
                                        {isSelected && (
                                            <View style={styles.modernSelectionIndicator}>
                                                <Icon name="check" size={16} color="#ffffff" />
                                            </View>
                                        )}

                                        {/* Consonant pair */}
                                        <Text style={[
                                            styles.modernConsonantText,
                                            isSelected && styles.modernConsonantTextSelected
                                        ]}>
                                            {pair.pair}
                                        </Text>

                                        {/* Vote count and percentage */}
                                        <View style={styles.modernVoteInfo}>
                                            <Text style={[
                                                styles.modernVoteText,
                                                isSelected && styles.modernVoteTextSelected
                                            ]}>
                                                {pair.votes} • {votePercentage}%
                                            </Text>
                                        </View>

                                        {/* Progress indicator */}
                                        <View style={styles.modernProgressContainer}>
                                            <View
                                                style={[
                                                    styles.modernProgressBar,
                                                    { width: `${votePercentage}%` },
                                                    isSelected && styles.modernProgressBarSelected
                                                ]}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Time's up state */}
                    {timeLeft === 0 && !hasVoted && (
                        <View style={styles.timeUpSection}>
                            <Card style={styles.timeUpCard}>
                                <CardContent style={styles.timeUpContent}>
                                    <View style={styles.timeUpIconContainer}>
                                        <Icon name="clock" size={24} color="#dc2626" />
                                    </View>
                                    <Text style={styles.timeUpTitle}>Time's Up!</Text>
                                    <Text style={styles.timeUpMessage}>
                                        The voting period has ended. A random option will be selected for you.
                                    </Text>
                                </CardContent>
                            </Card>
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
        backgroundColor: '##FFFFFF',
    },
    backgroundGradient: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    headerSection: {
        marginBottom: 24,
        alignItems: 'center',
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    voteIconContainer: {
        marginBottom: 16,
    },
    iconGradient: {
        width: 64,
        height: 64,
        borderRadius: 16,
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#8b4513',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b5b47',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 18,
    },
    timerCard: {
        marginBottom: 16,
        minWidth: width * 0.8,
    },
    timerContent: {
        padding: 16,
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timerIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerIconNormal: {
        backgroundColor: '#fef3e0',
    },
    timerIconDanger: {
        backgroundColor: '#fee2e2',
    },
    timerTextContainer: {
        flex: 1,
        alignItems: 'center',
    },
    timerText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    timerTextNormal: {
        color: '#f59e0b',
    },
    timerTextDanger: {
        color: '#dc2626',
    },
    timerLabel: {
        fontSize: 12,
        color: '#6b5b47',
        marginTop: 2,
    },
    timerDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    timerDotNormal: {
        backgroundColor: '#f59e0b',
    },
    timerDotDanger: {
        backgroundColor: '#dc2626',
    },
    progressOverview: {
        flexDirection: 'row',
        gap: 16,
    },
    progressItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    progressText: {
        fontSize: 14,
    },
    progressNumber: {
        color: '#2d2016',
        fontWeight: '600',
    },
    progressLabel: {
        color: '#6b5b47',
    },
    optionsSection: {
        marginBottom: 24,
    },
    optionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d2016',
        textAlign: 'center',
        marginBottom: 16,
    },
    optionsContainer: {
        gap: 16,
    },
    optionCard: {
        borderRadius: 12,
    },
    selectedOptionCard: {
        transform: [{ scale: 1.02 }],
    },
    disabledOptionCard: {
        opacity: 0.7,
    },
    optionCardInner: {
        borderWidth: 2,
        borderColor: 'rgba(45, 32, 22, 0.08)',
    },
    optionContent: {
        padding: 20,
    },
    optionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    consonantDisplay: {
        width: 64,
        height: 64,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    consonantDisplayNormal: {
        backgroundColor: 'rgba(139, 69, 19, 0.1)',
        borderColor: 'rgba(139, 69, 19, 0.2)',
    },
    consonantDisplaySelected: {
        backgroundColor: 'rgba(139, 69, 19, 0.2)',
        borderColor: '#8b4513',
    },
    consonantText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    consonantTextNormal: {
        color: '#8b4513',
    },
    consonantTextSelected: {
        color: '#8b4513',
    },
    optionInfo: {
        flex: 1,
        gap: 4,
    },
    optionNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d2016',
    },
    optionDescription: {
        fontSize: 12,
        color: '#6b5b47',
    },
    voteStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    voteBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: '#f5f1eb',
    },
    voteBadgeText: {
        fontSize: 10,
        color: '#6b5b47',
        fontWeight: '600',
    },
    votePercentage: {
        fontSize: 12,
        color: '#8b4513',
        fontWeight: '600',
    },
    selectionIndicator: {
        alignItems: 'center',
        gap: 4,
    },
    selectedText: {
        fontSize: 12,
        color: '#228b22',
        fontWeight: '600',
    },
    progressSection: {
        gap: 8,
    },
    progressBarContainer: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarBackground: {
        flex: 1,
        backgroundColor: '#f5f1eb',
        borderRadius: 4,
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    confirmSection: {
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    confirmButton: {
        height: 56,
        borderRadius: 12,
        shadowColor: '#2d2016',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    confirmButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    timeUpSection: {
        alignItems: 'center',
    },
    timeUpCard: {
        borderColor: '#fecaca',
        borderWidth: 1,
        maxWidth: width * 0.9,
    },
    timeUpContent: {
        padding: 24,
        alignItems: 'center',
        gap: 12,
    },
    timeUpIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fee2e2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeUpTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#dc2626',
    },
    timeUpMessage: {
        fontSize: 14,
        color: '#6b5b47',
        textAlign: 'center',
        lineHeight: 18,
    },

    // Modern compact consonant options styles
    modernOptionsSection: {
        marginBottom: 24,
    },
    modernOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    modernOptionCard: {
        width: '48%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: '#f0f0f0',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    modernOptionCardSelected: {
        backgroundColor: '#228b22',
        borderColor: '#1e7b1e',
        shadowColor: '#228b22',
        shadowOpacity: 0.3,
        elevation: 6,
    },
    modernSelectionIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modernConsonantText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#8b4513',
        textAlign: 'center',
        marginBottom: 8,
    },
    modernConsonantTextSelected: {
        color: '#ffffff',
    },
    modernDescriptionText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 18,
    },
    modernDescriptionTextSelected: {
        color: '#e8f5e8',
    },
    modernVoteInfo: {
        alignItems: 'center',
        marginBottom: 8,
    },
    modernVoteText: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
    },
    modernVoteTextSelected: {
        color: '#d0f0d0',
    },
    modernProgressContainer: {
        height: 3,
        backgroundColor: '#f0f0f0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    modernProgressBar: {
        height: '100%',
        backgroundColor: '#228b22',
    },
    modernProgressBarSelected: {
        backgroundColor: '#ffffff',
    },
    leaveButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 68, 68, 0.2)'
    },
});