import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    ScrollView,
    Alert,
    Animated,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// @ts-ignore - react-native-vector-icons types not available
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute } from '@react-navigation/native';

// Types and Store
import { RootStackParamList } from '../../types/navigation';
import { useStore } from '../../store';

// Components
import { Card } from '../../components/common';
import { BingoGrid, PlayerAvatarRow, TimerDisplay } from '../../components/game';

// Custom Hooks
import { useBingoBoard } from '../../hooks/useBingoBoard';
import { usePregameSocketListener } from '../../hooks/usePregameSocketListener';
import { useTimer } from '../../hooks/useTimer';
import { usePregameSocketEmitter } from '../../hooks/usePregameSocketEmitter';
import { socketService } from '../../services/socket';

type PreGameBoardScreenNavigationProp = any;

const { width } = Dimensions.get('window');

export function PreGameBoardScreen() {
    const navigation = useNavigation<PreGameBoardScreenNavigationProp>();
    const route = useRoute();

    // Get room and user data from storeBIN
    const { user } = useStore();
    const { currentRoom } = useStore();

    // Get route parameters
    const { roomId, winnerConsonant, roomData } = (route.params as any) || {};
    const currentConsonant = winnerConsonant || 'ㄱ';
    const BOARD_TIME_LIMIT = 180; // 3 minutes

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    // Board completion confirmation state
    const [isReadyConfirmed, setIsReadyConfirmed] = useState(false);

    // Custom hooks for board state and socket events using correct interfaces
    const {
        bingoBoard,
        setBingoBoard,
        completedCells,
        validCells,
        allCellsValidAndFilled,
        hasDuplicates,
        handleCellChange,
        handleCellFocus,
        handleCellBlur,
        getCellStyle,
        handleTimerExpired,
        isDuplicateWord,
        setConfirmedSnapshotFromBoard,
        setPostConfirmEditMode,
        postConfirmEditMode,
    } = useBingoBoard(currentConsonant, styles);

    // Socket events hook for player synchronization
    const { players } = usePregameSocketListener({ roomId, currentRoom, user });

    // Timer hook
    const { timeLeft, formatTime } = useTimer({
        initialTime: BOARD_TIME_LIMIT,
        onTimerExpired: handleTimerExpired
    });

    // Socket updates hook
    const { sendBoardProgressUpdate, sendCompletionStatus } = usePregameSocketEmitter({
        user,
        roomId,
        allCellsValidAndFilled,
        bingoBoard,
        currentConsonant
    });

    const totalCells = 25;

    // When the timer expires, request server to start game (server is authoritative)
    useEffect(() => {
        if (timeLeft === 0 && roomId) {
            (async () => {
                try {
                    // B) Force a final progress broadcast with 25 cells
                    console.log('⏰ [PREGAME] Timer expired. Forcing final progress update (25/25)...');
                    try { sendBoardProgressUpdate(25, true); } catch { }

                    // A) Ensure final snapshot is sent before requesting game start
                    console.log('⏰ [PREGAME] Timer expired. Sending final snapshot before game start...');
                    const readyRes = await sendCompletionStatus(true);
                    console.log('📦 [PREGAME] Final snapshot ack:', readyRes);

                    // Proceed to request game start with confirmed order (if any)
                    const order = useStore.getState().getConfirmedOrder?.() || [];
                    console.log('🚀 [PREGAME] Requesting game start with order:', order);
                    socketService.requestGameStart(roomId, { reason: 'timer_expired', confirmedOrder: order });
                } catch (e) {
                    console.error('❌ [PREGAME] Failed to finalize snapshot or request game start:', e);
                }
            })();
        }
    }, [timeLeft, roomId, sendCompletionStatus, sendBoardProgressUpdate]);

    // Navigate to in-game screen when server starts game
    useEffect(() => {
        const onGamePhaseStarted = (data: { turnOrder: string[] }) => {
            console.log('🎮 [NAV] Navigating to InGameBoardScreen');
            navigation.navigate('InGameBoardScreen' as never);
        };
        socketService.on('game-phase-started', onGamePhaseStarted);
        return () => {
            socketService.off('game-phase-started', onGamePhaseStarted);
        };
    }, [navigation]);

    // Entrance animation effect
    useEffect(() => {
        // Trigger entrance animations with staggered timing
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Progress calculations (memoized for performance)
    const progressPercentage = useMemo(() => {
        return Math.round((completedCells / 25) * 100);
    }, [completedCells]);

    const gameStatus = useMemo(() => {
        // Development override: Allow testing confirm button with minimal input
        const devOverride = __DEV__ && completedCells >= 3; // Only need 3 cells in dev mode

        if ((allCellsValidAndFilled || devOverride) && !hasDuplicates && isReadyConfirmed) {
            return 'ready';
        } else if ((allCellsValidAndFilled || devOverride) && !hasDuplicates) {
            return 'complete-pending-confirmation';
        } else if (completedCells > 0) {
            return 'in-progress';
        } else {
            return 'not-started';
        }
    }, [allCellsValidAndFilled, hasDuplicates, completedCells, isReadyConfirmed]);

    // Send board update when progress changes
    useEffect(() => {
        sendBoardProgressUpdate(completedCells);
    }, [completedCells, sendBoardProgressUpdate]);

    // NOTE: Removed problematic useEffect - React state timing causes it to run with old values
    // Instead, we rely on immediate socket calls in handleConfirmReady for reliable status updates



    const handleConfirmReady = () => {
        console.log('🎯 [CONFIRM_READY] Button clicked - starting ready process');
        console.log('🔍 [CONFIRM_READY] Current state BEFORE changes:', {
            isReadyConfirmed,
            allCellsValidAndFilled,
            hasDuplicates,
            completedCells,
            devOverride: __DEV__ && completedCells >= 3
        });

        // Complete the bingoBoard with current state
        const finalBoard = bingoBoard.map(row =>
            row.map(cell => ({
                ...cell,
                word: cell.word || cell.previousWord || '',
                isValid: cell.isValid || !!cell.previousWord, // Accept previous word as valid
                isValidating: false,
            }))
        );

        setBingoBoard(finalBoard);
        // Capture immutable snapshot on first confirm only
        setConfirmedSnapshotFromBoard(finalBoard);
        // Ensure edit mode is off when confirming
        setPostConfirmEditMode(false);

        // Set as confirmed ready
        console.log('🔄 [CONFIRM_READY] Setting isReadyConfirmed to TRUE');
        setIsReadyConfirmed(true);

        // Log what the state SHOULD be after the update
        console.log('🔍 [CONFIRM_READY] Expected state AFTER changes:', {
            isReadyConfirmed: true, // This is what we just set
            allCellsValidAndFilled,
            hasDuplicates,
            completedCells,
            devOverride: __DEV__ && completedCells >= 3,
            shouldTriggerUseEffect: true
        });

        // IMMEDIATE: Send completion status right away (don't wait for useEffect)
        console.log('🚀 [CONFIRM_READY] About to call sendCompletionStatus(true)');
        try {
            sendCompletionStatus(true)
                .then((res) => {
                    console.log('✅ [CONFIRM_READY] sendCompletionStatus ack:', res);
                })
                .catch((error) => {
                    console.error('❌ [CONFIRM_READY] sendCompletionStatus error:', error);
                });
        } catch (error) {
            console.error('❌ [CONFIRM_READY] sendCompletionStatus threw:', error);
        }

        // IMMEDIATE: Force board progress update with completion
        console.log('🚀 [CONFIRM_READY] About to call sendBoardProgressUpdate(25, true)');
        try {
            const progressResult = sendBoardProgressUpdate(25, true); // Force send with 25 cells completed
            console.log('✅ [CONFIRM_READY] sendBoardProgressUpdate called, result:', progressResult);
        } catch (error) {
            console.error('❌ [CONFIRM_READY] sendBoardProgressUpdate error:', error);
        }

        // DEBUG: Check what the PlayerAvatarRow will receive
        console.log('🎨 [AVATAR_DEBUG] PlayerAvatarRow will receive:', {
            isCurrentUserReady: true, // This is what we're passing now
            completedCells,
            currentUserId: user?.id
        });

        Alert.alert(
            '보드 완성! 🎉',
            '준비 완료되었습니다. 다른 플레이어들을 기다리고 있습니다.',
            [{ text: '확인', style: 'default' }]
        );
    };

    // Option B: explicit Edit Board control to revert readiness and allow edits again
    const handleEditBoard = () => {
        console.log('✏️ [EDIT_BOARD] Switching to edit mode after confirm');
        // Enter post-confirm edit mode so invalid changes revert to confirmed snapshot per-cell
        setPostConfirmEditMode(true);
        // Locally mark as not ready
        setIsReadyConfirmed(false);
        // Broadcast unready to others
        try {
            sendCompletionStatus(false);
            // Share current progress for avatars
            sendBoardProgressUpdate(completedCells, true);
        } catch (err) {
            console.error('❌ [EDIT_BOARD] Failed to emit unready:', err);
        }
    };

    // Helper function to get player status based on board completion
    const getPlayerStatus = (player: any, cellsCompleted?: number) => {
        const totalCells = 25;
        const completed = cellsCompleted || 0;

        if (completed === 0) return 'not-started'; // grey border
        if (completed === totalCells && player.boardCompleted) return 'completed'; // green border  
        return 'in-progress'; // yellow border
    };

    // Helper function to get avatar border color based on status
    const getAvatarBorderColor = (status: string) => {
        switch (status) {
            case 'completed': return '#22c55e'; // green
            case 'in-progress': return '#eab308'; // yellow
            case 'not-started': return '#9ca3af'; // grey
            default: return '#9ca3af';
        }
    };



    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['##FFFFFF', '#f5f1eb']}
                style={styles.backgroundGradient}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Animated container for graceful entrance */}
                    <Animated.View
                        style={[
                            {
                                opacity: fadeAnim,
                                transform: [
                                    { translateY: slideAnim },
                                    { scale: scaleAnim },
                                ],
                            },
                        ]}
                    >
                        {/* Modern Consonant Badge - Top Center */}
                        <View style={styles.modernConsonantContainer}>
                            <View style={styles.badgeWrapper}>
                                <View style={styles.modernBadgeOuter}>
                                    <View style={styles.modernBadgeInner}>
                                        <Text style={styles.modernConsonantText}>{currentConsonant}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <PlayerAvatarRow
                            players={currentRoom?.players || []}
                            playersFromState={players}
                            currentUserId={user?.id}
                            completedCells={completedCells}
                            isCurrentUserReady={isReadyConfirmed}
                        />

                        {/* Timer Display - Using Subcomponent */}
                        <TimerDisplay
                            timeLeft={timeLeft}
                            formatTime={formatTime}
                            validCells={validCells}
                            totalCells={totalCells}
                        />

                        {/* Bingo Grid - Using Subcomponent */}
                        <BingoGrid
                            bingoBoard={bingoBoard}
                            timeLeft={timeLeft}
                            editable={!isReadyConfirmed}
                            getCellStyle={getCellStyle}
                            onCellChange={handleCellChange}
                            onCellFocus={handleCellFocus}
                            onCellBlur={handleCellBlur}
                        />

                        {/* Action Section - Show different content based on completion status */}
                        {gameStatus === 'complete-pending-confirmation' && (
                            <View style={styles.actionSection}>
                                <Card style={styles.completionCard}>
                                    <View style={styles.completionContent}>
                                        <View style={styles.completionIcon}>
                                            <Icon name="check-circle" size={24} color="#22c55e" />
                                        </View>
                                        <Text style={styles.completionTitle}>Board Complete! 🎉</Text>
                                        <Text style={styles.completionMessage}>
                                            Great job! Your board is ready for the game.
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.confirmButton}
                                            onPress={handleConfirmReady}
                                            activeOpacity={0.8}
                                        >
                                            <Icon name="thumbs-up" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                                            <Text style={styles.confirmButtonText}>Confirm Ready! ✅</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Card>
                            </View>
                        )}
                        {/* Show completion status */}
                        {gameStatus === 'ready' && (
                            <View style={styles.completionStatusSection}>
                                <Text style={styles.readyStatusText}>
                                    ✅ Ready to play! Waiting for other players...
                                </Text>
                                {/* Option B: Allow user to return to edit mode intentionally */}
                                <TouchableOpacity
                                    style={[styles.editButton]}
                                    onPress={handleEditBoard}
                                    activeOpacity={0.9}
                                >
                                    <Icon name="edit-3" size={18} color="#8b4513" />
                                    <Text style={styles.editButtonText}>Edit Board</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>
                </ScrollView >
            </LinearGradient >
        </SafeAreaView >
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
        flex: 1
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    headerSection: {
        marginBottom: 24,
        alignItems: 'center',
        gap: 16,
    },
    titleContainer: {
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#8b4513',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#6b5b47',
        textAlign: 'center',
    },
    instruction: {
        fontSize: 14,
        color: '#6b5b47',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    consonantText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#8b4513',
    },
    statusRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
        justifyContent: 'center',
    },
    statusCard: {
        minWidth: width * 0.3,
    },
    statusContent: {
        padding: 12,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2d2016',
    },
    dangerText: {
        color: '#dc2626',
    },
    progressSection: {
        position: 'relative'
    },
    boardSection: {
        marginBottom: 24,
    },
    boardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    boardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2d2016',
    },
    modernConsonantContainer: {
        alignItems: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    badgeWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    modernBadgeLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8B4513',
        letterSpacing: 2,
        marginBottom: 8,
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    modernBadgeOuter: {
        borderRadius: 24,
        padding: 3,
        elevation: 12,
    },
    modernBadgeInner: {
        width: 100,
        height: 100,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    glassMorphOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 21,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    modernConsonantText: {
        fontSize: 48,
        fontWeight: '900',
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        letterSpacing: -1,
    },
    modernAccentLine: {
        width: 30,
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 1,
        marginTop: 4,
    },
    modernBadgeSubtext: {
        fontSize: 10,
        fontWeight: '500',
        color: '#8B4513',
        letterSpacing: 1,
        marginTop: 8,
        opacity: 0.7,
        textTransform: 'uppercase',
    },
    compactTimer: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    timerText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2d2016',
    },
    boardCard: {
        marginTop: 16,
        borderWidth: 2,
        borderColor: 'rgba(139, 69, 19, 0.2)',
        elevation: 4,
        shadowColor: '#2d2016',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    boardContent: {
        padding: 8,
    },
    bingoGrid: {
        gap: 4,
    },
    bingoRow: {
        flexDirection: 'row',
        gap: 4,
    },
    bingoCell: {
        flex: 1,
        aspectRatio: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(139, 69, 19, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        elevation: 2,
        shadowColor: '#2d2016',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    focusedCell: {
        backgroundColor: '#fff7ed',
        borderColor: '#f59e0b',
        borderWidth: 3,
        elevation: 4,
    },
    validCell: {
        backgroundColor: '#f0fdf4',
        borderColor: '#22c55e',
        borderWidth: 2,
    },
    invalidCell: {
        backgroundColor: '#fef2f2',
        borderColor: '#ef4444',
        borderWidth: 2,
    },
    cellInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#2d2016',
        textAlign: 'center',
        padding: 8,
        minHeight: 40,
    },
    focusedInput: {
        color: '#f59e0b',
    },
    validInput: {
        color: '#22c55e',
    },
    invalidInput: {
        color: '#ef4444',
    },
    validationIndicator: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    playersSection: {
        marginBottom: 24,
    },
    playersTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2d2016',
        marginBottom: 12,
    },
    playersGrid: {
        gap: 12,
    },
    playerCard: {
        borderWidth: 1,
        borderColor: 'rgba(139, 69, 19, 0.1)',
    },
    readyPlayerCard: {
        borderColor: '#22c55e',
        borderWidth: 2,
        backgroundColor: 'rgba(34, 197, 94, 0.02)',
    },
    playerContent: {
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    playerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(139, 69, 19, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    readyPlayerAvatar: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
    },
    playerAvatarText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#8b4513',
    },
    playerDetails: {
        flex: 1,
        gap: 2,
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d2016',
    },
    playerProgress: {
        fontSize: 12,
        color: '#6b5b47',
    },
    playerStatus: {
        alignItems: 'flex-end',
    },
    readyBadge: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    readyBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ffffff',
    },
    workingBadge: {
        backgroundColor: '#fef3e0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    workingBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#f59e0b',
    },
    actionSection: {
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    doneButton: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        shadowColor: '#2d2016',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        backgroundColor: '#f5f1eb',
        borderColor: '#d1d5db',
        borderWidth: 1,
    },
    doneButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    doneButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    completionCard: {
        backgroundColor: '#f0fdf4',
        borderColor: '#22c55e',
        borderWidth: 2,
        marginTop: 16,
    },
    completionContent: {
        alignItems: 'center',
        padding: 20,
    },
    completionIcon: {
        marginBottom: 12,
    },
    completionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#15803d',
        marginBottom: 8,
    },
    completionMessage: {
        fontSize: 14,
        color: '#166534',
        textAlign: 'center',
    },
    completionStatusSection: {
        alignItems: 'center',
        marginTop: 16,
        padding: 12,
    },
    readyStatusText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#15803d',
        textAlign: 'center',
    },
    actionHint: {
        fontSize: 14,
        color: '#6b5b47',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    boardStatusCard: {
        backgroundColor: '#f8f6f0',
        borderColor: '#e5e1d8',
        borderWidth: 1,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        gap: 12,
    },
    progressText: {
        position: 'absolute',
        right: 0,
        fontSize: 16,
        fontWeight: '600'
    },
    duplicateWarning: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 13,
    },
    waitingSection: {
        marginBottom: 24,
    },
    waitingCard: {
        borderColor: '#22c55e',
        borderWidth: 2,
    },
    waitingContent: {
        padding: 24,
        alignItems: 'center',
        gap: 16,
    },
    waitingIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#f0fdf4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    waitingTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#22c55e',
        textAlign: 'center',
    },
    waitingMessage: {
        fontSize: 16,
        color: '#6b5b47',
        textAlign: 'center',
        lineHeight: 24,
    },
    loadingDots: {
        flexDirection: 'row',
        gap: 8,
        marginVertical: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    dot1: {
        // Animation would be added in production
    },
    dot2: {
        // Animation would be added in production
    },
    dot3: {
        // Animation would be added in production
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#fef3e0',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(139, 69, 19, 0.2)',
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8b4513',
    },
    // Validation UI styles
    validatingCell: {
        borderColor: '#3b82f6',
        borderWidth: 2,
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
    },
    validationSpinner: {
        width: 16,
        height: 16,
    },
    errorTooltip: {
        position: 'absolute',
        bottom: -35,
        left: 0,
        right: 0,
        backgroundColor: '#fee2e2',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 6,
        padding: 6,
        zIndex: 1000,
    },
    errorText: {
        fontSize: 10,
        color: '#dc2626',
        textAlign: 'center',
        fontWeight: '500',
    },
    definitionTooltip: {
        position: 'absolute',
        bottom: -35,
        left: 0,
        right: 0,
        backgroundColor: '#f0fdf4',
        borderColor: '#22c55e',
        borderWidth: 1,
        borderRadius: 6,
        padding: 6,
        zIndex: 1000,
    },
    definitionText: {
        fontSize: 10,
        color: '#15803d',
        textAlign: 'center',
        fontWeight: '500',
    },
    // Player Avatar Styles
    playersSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d2016',
        marginBottom: 12,
        textAlign: 'center',
    },
    playersAvatarContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
    },
    playerAvatarWrapper: {
        alignItems: 'center',
        position: 'relative',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d2016',
    },
    hostBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#fef3c7',
        borderRadius: 8,
        padding: 2,
        borderWidth: 1,
        borderColor: '#fbbf24',
    },
    statusLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        marginTop: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    // Confirmation button styles
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#22c55e',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        marginTop: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonIcon: {
        marginRight: 8,
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});