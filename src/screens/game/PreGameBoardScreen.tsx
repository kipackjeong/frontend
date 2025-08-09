import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Alert,
    TextInput,
    Keyboard,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { Card, CardContent } from '../../components/common';
import Button from '../../components/common/Button';
import PlayerProgressList from '../../components/common/PlayerProgressList';
import Badge from '../../components/common/Badge';
import { koreanDictionaryService, WordValidationResult } from '../../services/koreanDictionary';
import { socketService } from '../../services/socket';
import { useStore } from '../../store';
import { Player } from '../../types';
import { PreGameBoardScreenNavigationProp, RootStackParamList } from '../../types/navigation';
import logger from '../../utils/logger';

const { width, height } = Dimensions.get('window');

interface BingoCell {
    id: string;
    word: string;
    isValid: boolean;
    isFocused: boolean;
    isValidating?: boolean;
    validationError?: string;
    definition?: string;
    previousWord?: string; // Store previous word for timer fallback
}

interface PreGamePlayer extends Player {
    boardCompleted: boolean;
    cellsCompleted: number;
}

type PreGameBoardScreenRouteProp = RouteProp<RootStackParamList, 'PreGameBoardScreen'>;

export function PreGameBoardScreen() {
    const navigation = useNavigation<PreGameBoardScreenNavigationProp>();
    const route = useRoute<PreGameBoardScreenRouteProp>();

    // Get room and user data from store
    const { user } = useStore();
    const storeRoom = useStore(state => state.room);

    // Get route parameters
    const { roomId, winnerConsonant, roomData } = route.params;

    // Use passed roomData as fallback if store room is null (fixes navigation state loss)
    const currentRoom = storeRoom || roomData;

    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes to fill board
    const [currentConsonant] = useState(winnerConsonant); // Winner consonant from voting
    const [isDone, setIsDone] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);
    const [players, setPlayers] = useState<PreGamePlayer[]>([]);
    const [allPlayersReady, setAllPlayersReady] = useState(false);
    const inputRefs = useRef<TextInput[][]>([]);

    // Animation values for graceful entrance
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    // Socket update optimization - debounce board updates
    const socketUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSocketUpdate = useRef({ cellsCompleted: 0, timestamp: 0 });
    const SOCKET_UPDATE_DEBOUNCE_MS = 2000; // 2 seconds debounce for board updates

    // Initialize empty 5x5 board
    const [bingoBoard, setBingoBoard] = useState<BingoCell[][]>(() => {
        const board = [];
        for (let row = 0; row < 5; row++) {
            const rowCells = [];
            for (let col = 0; col < 5; col++) {
                rowCells.push({
                    id: `${row}-${col}`,
                    word: '',
                    isValid: false,
                    isFocused: false,
                });
            }
            board.push(rowCells);
        }
        return board;
    });

    // Real-time player data from Socket.IO events (replacing mock data)

    const totalCells = 25;
    const completedCells = bingoBoard.flat().filter(cell => cell.word !== '').length;
    const validCells = bingoBoard.flat().filter(cell => cell.word !== '' && cell.isValid).length;
    const completedPercentage = Math.round((completedCells / totalCells) * 100);

    // Check for duplicate words
    const allWords = bingoBoard.flat().map(cell => cell.word.trim().toLowerCase()).filter(word => word !== '');
    const uniqueWords = new Set(allWords);
    const hasDuplicates = allWords.length !== uniqueWords.size;

    const allCellsValidAndFilled = validCells === totalCells && !hasDuplicates;

    // Timer countdown with fallback logic
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0) {
            // Time's up - handle fallback for any currently editing cells
            handleTimerExpired();
        }
    }, [timeLeft]);

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
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Monitor board progress and send optimized socket updates
    useEffect(() => {
        // Send debounced progress update when board changes
        sendBoardProgressUpdate(completedCells);
    }, [completedCells]); // Only trigger when completedCells changes

    // Debug room state resolution only when room state changes (not on every render)
    useEffect(() => {
        logger.debug(`🔄 [ROOM_FALLBACK] Room state resolution:`, {
            storeRoomExists: !!storeRoom,
            passedRoomExists: !!roomData,
            usingRoom: currentRoom ? 'found' : 'none',
            finalPlayerCount: currentRoom?.players?.length || 0
        });
    }, [storeRoom, roomData, currentRoom?.players?.length]); // Only run when room state actually changes

    // Initialize players state with room players on mount
    useEffect(() => {
        logger.debug(`🏠 [INIT] Initializing players from room:`, currentRoom?.players?.map(p => ({ id: p.id, username: p.username })));

        // 🔍 DEBUG: Comprehensive room state debugging
        logger.debug(`🔍 [ROOM_DEBUG] Full currentRoom state:`, {
            roomExists: !!currentRoom,
            roomId: currentRoom?.id,
            roomCode: currentRoom?.code,
            playerCount: currentRoom?.players?.length || 0,
            players: currentRoom?.players?.map(p => ({ id: p.id, username: p.username, isHost: p.isHost })),
            roomStatus: currentRoom?.status
        });

        logger.debug(`🔍 [PARAMS_DEBUG] Route params:`, {
            routeRoomId: roomId,
            winnerConsonant: currentConsonant,
            paramsMatch: roomId === currentRoom?.id
        });

        if (currentRoom?.players) {
            // Initialize players state with current room players
            const initialPlayers: PreGamePlayer[] = currentRoom.players.map(player => ({
                id: player.id,
                username: player.username,
                isHost: player.isHost || false,
                isReady: false, // Everyone starts not ready in pregame phase
                avatar: player.avatar || player.username?.charAt(0)?.toUpperCase() || '👤',
                boardCompleted: false, // Nobody has completed boards yet
                cellsCompleted: 0, // Everyone starts with 0 cells completed in pregame phase
            }));

            setPlayers(initialPlayers);
            logger.debug(`✅ [INIT] Successfully initialized ${initialPlayers.length} players`);
        } else {
            logger.debug(`⚠️ [INIT] No players found in currentRoom - requesting room data from backend`);

            // Fallback: Request current room data if players are missing
            if (roomId) {
                socketService.requestPregameStatus(roomId)
                    .then((response: any) => {
                        logger.debug(`📡 [FALLBACK] Requested pregame status:`, response);
                    })
                    .catch((error: any) => {
                        logger.debug(`❌ [FALLBACK] Failed to request pregame status:`, error);
                    });
            }
        }
    }, [currentRoom?.players, roomId]);

    // Socket event listeners for real-time player updates
    useEffect(() => {
        const handlePlayerBoardUpdated = (data: {
            playerId: string;
            cellsCompleted: number;
            totalCells: number;
            isComplete: boolean;
            completionPercentage: number;
            timestamp: string;
        }) => {
            logger.debug(`📡 [SOCKET] Received board update from ${data.playerId}: ${data.cellsCompleted}/${data.totalCells} cells`)
            console.log(`🔄 [AVATAR_SYNC] Updating avatar status for player ${data.playerId} -> ${data.cellsCompleted} cells`);

            // Update player state in the players array
            setPlayers(prevPlayers => {
                const updated = prevPlayers.map(player =>
                    player.id === data.playerId
                        ? { ...player, cellsCompleted: data.cellsCompleted, boardCompleted: data.isComplete }
                        : player
                );

                // If player not found in current players, add them (in case they joined after init)
                if (!updated.find(p => p.id === data.playerId)) {
                    console.log(`👤 [SOCKET] Adding new player from board update: ${data.playerId}`);
                    updated.push({
                        id: data.playerId,
                        username: `Player_${data.playerId.slice(-6)}`, // Fallback username
                        isHost: false,
                        isReady: data.isComplete,
                        avatar: '👤',
                        boardCompleted: data.isComplete,
                        cellsCompleted: data.cellsCompleted,
                    });
                }

                return updated;
            });
        };

        const handlePlayerReadyUpdated = (data: {
            playerId: string;
            isReady: boolean;
            boardData?: any;
            timestamp: string;
        }) => {
            console.log(`📡 [SOCKET] Player ready status updated: ${data.playerId} -> ${data.isReady}`);

            // Update player ready status
            setPlayers(prevPlayers => {
                const updated = prevPlayers.map(player =>
                    player.id === data.playerId
                        ? { ...player, isReady: data.isReady, boardCompleted: data.isReady }
                        : player
                );

                // If player not found, add them
                if (!updated.find(p => p.id === data.playerId)) {
                    console.log(`👤 [SOCKET] Adding new player from ready update: ${data.playerId}`);
                    updated.push({
                        id: data.playerId,
                        username: `Player_${data.playerId.slice(-6)}`,
                        isHost: false,
                        isReady: data.isReady,
                        avatar: '👤',
                        boardCompleted: data.isReady,
                        cellsCompleted: data.isReady ? 25 : 0,
                    });
                }

                return updated;
            });
        };

        const handlePlayerBoardCompleted = (data: {
            playerId: string;
            completedCells: number;
            consonant: string;
            timestamp: string;
        }) => {
            console.log(`🎉 [SOCKET] Player completed board: ${data.playerId}`);

            // Update player completion status
            setPlayers(prevPlayers => {
                const updated = prevPlayers.map(player =>
                    player.id === data.playerId
                        ? { ...player, cellsCompleted: data.completedCells, boardCompleted: true, isReady: true }
                        : player
                );

                // If player not found, add them
                if (!updated.find(p => p.id === data.playerId)) {
                    console.log(`👤 [SOCKET] Adding new player from completion: ${data.playerId}`);
                    updated.push({
                        id: data.playerId,
                        username: `Player_${data.playerId.slice(-6)}`,
                        isHost: false,
                        isReady: true,
                        avatar: '👤',
                        boardCompleted: true,
                        cellsCompleted: data.completedCells,
                    });
                }

                return updated;
            });
        };

        // Ensure socket connection and join room for real-time avatar sync
        const setupSocketConnection = async () => {
            try {
                if (!socketService.isConnected() && user?.id) {
                    console.log('🔌 [AVATAR_SYNC] Connecting socket for real-time sync...');
                    await socketService.connect(user.id);
                }

                if (roomId && currentRoom?.code && user?.id) {
                    console.log('🏠 [AVATAR_SYNC] Joining room for live updates:', currentRoom.code);
                    socketService.joinRoom(currentRoom.code, user.id);
                }
            } catch (error) {
                console.error('❌ [AVATAR_SYNC] Socket connection failed:', error);
            }
        };

        setupSocketConnection();

        // Register socket event listeners
        socketService.on('pregame:player_board_updated', handlePlayerBoardUpdated);
        socketService.on('pregame:player_ready_updated', handlePlayerReadyUpdated);
        socketService.on('pregame:player_board_completed', handlePlayerBoardCompleted);

        // Request current status when joining
        if (roomId) {
            socketService.requestPregameStatus(roomId);
        }

        // Cleanup listeners on unmount
        return () => {
            socketService.off('pregame:player_board_updated', handlePlayerBoardUpdated);
            socketService.off('pregame:player_ready_updated', handlePlayerReadyUpdated);
            socketService.off('pregame:player_board_completed', handlePlayerBoardCompleted);
        };
    }, [roomId]);

    // Handle timer expiration - fallback editing cells to previous words
    const handleTimerExpired = () => {
        const newBoard = [...bingoBoard];
        let hasChanges = false;

        newBoard.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                // If cell is currently being edited or validated, revert to previous word
                if ((cell.isFocused || cell.isValidating) && cell.previousWord !== undefined) {
                    console.log(`⏰ Timer expired: Reverting cell ${rowIndex}-${colIndex} from "${cell.word}" to "${cell.previousWord}"`);
                    newBoard[rowIndex][colIndex] = {
                        ...cell,
                        word: cell.previousWord,
                        isValid: true, // Previous word was valid
                        isFocused: false,
                        isValidating: false,
                        validationError: undefined,
                        previousWord: undefined
                    };
                    hasChanges = true;
                }
            });
        });

        if (hasChanges) {
            setBingoBoard(newBoard);
        }

        // Clear any pending validation timeouts
        Object.values(validationTimeoutRef.current).forEach(timeout => {
            if (timeout) clearTimeout(timeout);
        });
        validationTimeoutRef.current = {};

        Alert.alert(
            'Time\'s Up!',
            hasChanges
                ? 'Time limit reached. Any incomplete edits have been reverted to previous words.'
                : 'Time limit reached. Board finalized with current words.',
            [{ text: 'OK' }]
        );
    };

    // Check if a word is duplicated elsewhere on the board
    const isDuplicateWord = (word: string, currentRowIndex: number, currentColIndex: number): boolean => {
        if (!word || word.trim() === '') return false;

        const trimmedWord = word.trim().toLowerCase();

        for (let rowIndex = 0; rowIndex < bingoBoard.length; rowIndex++) {
            for (let colIndex = 0; colIndex < bingoBoard[rowIndex].length; colIndex++) {
                // Skip current cell
                if (rowIndex === currentRowIndex && colIndex === currentColIndex) continue;

                const otherWord = bingoBoard[rowIndex][colIndex].word.trim().toLowerCase();
                if (otherWord === trimmedWord) {
                    return true;
                }
            }
        }
        return false;
    };

    // Real-time word validation using Korean Dictionary API
    const validateWordAsync = async (word: string, rowIndex: number, colIndex: number): Promise<void> => {
        console.log(`🔍 Validating word: "${word}" at position ${rowIndex}-${colIndex}`);

        if (!word || word.trim() === '') {
            // Empty word - clear validation state
            const newBoard = [...bingoBoard];
            newBoard[rowIndex][colIndex] = {
                ...newBoard[rowIndex][colIndex],
                isValid: false,
                isValidating: false,
                validationError: undefined,
                definition: undefined,
            };
            setBingoBoard(newBoard);
            return;
        }

        // Check for duplicates first
        if (isDuplicateWord(word, rowIndex, colIndex)) {
            console.log(`🔄 Duplicate word detected: "${word}"`);
            const newBoard = [...bingoBoard];
            newBoard[rowIndex][colIndex] = {
                ...newBoard[rowIndex][colIndex],
                isValid: false,
                isValidating: false,
                validationError: 'This word is already used on the board',
                definition: undefined,
            };
            setBingoBoard(newBoard);
            return;
        }

        // Set loading state
        const newBoard = [...bingoBoard];
        newBoard[rowIndex][colIndex] = {
            ...newBoard[rowIndex][colIndex],
            isValidating: true,
            validationError: undefined,
        };
        setBingoBoard(newBoard);

        try {
            const result: WordValidationResult = await koreanDictionaryService.validateWord(word, currentConsonant);

            console.log(`✅ Validation result for "${word}": valid=${result.isValid}, exists=${result.existsInDictionary}`);
            if (result.definition) {
                console.log(`📖 Definition: ${result.definition}`);
            }
            if (result.error) {
                console.log(`❌ Validation error: ${result.error}`);
            }

            // Update board with validation result
            const updatedBoard = [...bingoBoard];
            updatedBoard[rowIndex][colIndex] = {
                ...updatedBoard[rowIndex][colIndex],
                isValid: result.isValid,
                isValidating: false,
                validationError: result.error,
                definition: result.definition,
            };
            setBingoBoard(updatedBoard);

        } catch (error) {
            console.error('❌ Word validation failed:', error);

            // Update board with error state
            const errorBoard = [...bingoBoard];
            errorBoard[rowIndex][colIndex] = {
                ...errorBoard[rowIndex][colIndex],
                isValid: false,
                isValidating: false,
                validationError: 'Validation failed',
            };
            setBingoBoard(errorBoard);
        }
    };

    // Debounced validation to avoid too many API calls
    const validationTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

    const debouncedValidation = (word: string, rowIndex: number, colIndex: number) => {
        const cellKey = `${rowIndex}-${colIndex}`;

        // Clear existing timeout for this cell
        if (validationTimeoutRef.current[cellKey]) {
            clearTimeout(validationTimeoutRef.current[cellKey]);
        }

        // Set new timeout for validation (500ms delay)
        validationTimeoutRef.current[cellKey] = setTimeout(() => {
            validateWordAsync(word, rowIndex, colIndex);
        }, 500);
    };

    const handleCellChange = (rowIndex: number, colIndex: number, text: string) => {
        const newBoard = [...bingoBoard];
        const currentCell = newBoard[rowIndex][colIndex];

        // Store previous word if it was valid (for timer fallback)
        const previousWord = currentCell.isValid && currentCell.word !== '' ? currentCell.word : currentCell.previousWord;

        // Update word immediately for responsive UI
        newBoard[rowIndex][colIndex] = {
            ...currentCell,
            word: text,
            isValid: false, // Reset validation state
            validationError: undefined,
            definition: undefined,
            previousWord: previousWord, // Store for potential fallback
        };

        setBingoBoard(newBoard);

        // Trigger debounced validation
        debouncedValidation(text, rowIndex, colIndex);
    };

    const handleCellFocus = (rowIndex: number, colIndex: number) => {
        const newBoard = [...bingoBoard];
        // Reset all focus states
        newBoard.forEach(row => {
            row.forEach(cell => {
                cell.isFocused = false;
            });
        });
        // Set current cell as focused
        newBoard[rowIndex][colIndex].isFocused = true;
        setBingoBoard(newBoard);
    };

    const handleCellBlur = (rowIndex: number, colIndex: number) => {
        const newBoard = [...bingoBoard];
        newBoard[rowIndex][colIndex].isFocused = false;
        setBingoBoard(newBoard);
    };

    const handleDone = () => {
        // This function should only be called when all cells are valid and filled
        // but let's double-check as a safeguard
        if (!allCellsValidAndFilled) {
            const incompleteCells = bingoBoard.flat().filter(cell =>
                cell.word === '' || !cell.isValid
            ).length;
            Alert.alert(
                'Incomplete Board',
                `You have ${incompleteCells} empty or invalid cells. Complete all cells with valid words containing ${currentConsonant}.`,
                [{ text: 'OK' }]
            );
            return;
        }

        if (!currentRoom?.id || !user?.id) {
            Alert.alert('Error', 'Unable to save progress. Please check your connection.', [{ text: 'OK' }]);
            return;
        }

        setIsDone(true);
        setIsWaiting(true);

        // Clear all previous words since board is finalized
        const finalBoard = [...bingoBoard];
        finalBoard.forEach(row => {
            row.forEach(cell => {
                cell.previousWord = undefined;
            });
        });
        setBingoBoard(finalBoard);

        // Notify backend that player is ready via optimized socket function
        console.log('🎯 Marking player as ready - sending to backend');
        sendCompletionStatus(true);

        Alert.alert(
            'Board Complete!',
            'Your board is ready! Other players will be notified. You can still edit if needed.',
            [{ text: 'Got it!' }]
        );
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCellStyle = (cell: BingoCell) => {
        if (cell.isFocused) return [styles.bingoCell, styles.focusedCell];
        if (cell.isValidating) return [styles.bingoCell, styles.validatingCell];
        if (cell.word && cell.isValid) return [styles.bingoCell, styles.validCell];
        if (cell.word && !cell.isValid) return [styles.bingoCell, styles.invalidCell];
        return styles.bingoCell;
    };

    // Helper function to get player status based on board completion
    const getPlayerStatus = (player: Player, cellsCompleted?: number) => {
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

    // 🔄 OPTIMIZED SOCKET UPDATE FUNCTIONS

    /**
     * Send debounced board progress updates to other players
     * Only sends updates if cellsCompleted changed and after debounce delay
     */
    const sendBoardProgressUpdate = (cellsCompleted: number, force: boolean = false) => {
        const now = Date.now();
        const { cellsCompleted: lastCells, timestamp: lastTime } = lastSocketUpdate.current;

        // Skip if no change in progress (unless forced)
        if (!force && cellsCompleted === lastCells) {
            return;
        }

        // Skip if update too recent (unless forced or completion)
        if (!force && (now - lastTime) < SOCKET_UPDATE_DEBOUNCE_MS) {
            // Schedule delayed update
            if (socketUpdateTimeoutRef.current) {
                clearTimeout(socketUpdateTimeoutRef.current);
            }

            socketUpdateTimeoutRef.current = setTimeout(() => {
                sendBoardProgressUpdate(cellsCompleted, true);
            }, SOCKET_UPDATE_DEBOUNCE_MS);
            return;
        }

        // Clear any pending timeout
        if (socketUpdateTimeoutRef.current) {
            clearTimeout(socketUpdateTimeoutRef.current);
            socketUpdateTimeoutRef.current = null;
        }

        // Send the update
        if (user?.id && roomId) {
            const isComplete = cellsCompleted === 25 && allCellsValidAndFilled;

            console.log(`📤 [AVATAR_SYNC] Sending board progress to other players: ${cellsCompleted}/25 cells`);
            console.log(`🔍 [DEBUG] Socket update parameters:`, {
                roomId,
                userId: user.id,
                cellsCompleted,
                totalCells: 25,
                isComplete,
                socketConnected: socketService.isConnected()
            });

            socketService.updatePregameBoardStatus(
                roomId,
                user.id,
                cellsCompleted,
                25,
                isComplete
            ).then((response: { success: boolean; message?: string }) => {
                if (response.success) {
                    console.log(`✅ [AVATAR_SYNC] Successfully broadcasted progress: ${cellsCompleted}/25 cells`);
                    lastSocketUpdate.current = { cellsCompleted, timestamp: now };
                } else {
                    console.error(`❌ [AVATAR_SYNC] Backend rejected board progress update:`);
                    console.error(`   Error: ${response.message}`);
                    console.error(`   Params sent: roomId=${roomId}, userId=${user.id}, cells=${cellsCompleted}`);
                }
            }).catch((error: any) => {
                console.error('❌ [AVATAR_SYNC] Board broadcast error:', error);
            });
        }
    };

    /**
     * Send immediate completion status to other players
     */
    const sendCompletionStatus = (isReady: boolean) => {
        if (user?.id && roomId) {
            const boardData = {
                board: bingoBoard,
                completedCells: completedCells,
                timestamp: new Date().toISOString(),
                playerId: user.id,
                consonant: currentConsonant
            };

            socketService.setPreGameReady(roomId, isReady, boardData)
                .then((response: { success: boolean; message?: string }) => {
                    if (response.success) {
                        console.log(`✅ [SOCKET] Ready status updated: ${isReady}`);
                    } else {
                        console.error('❌ [SOCKET] Failed to update ready status:', response.message);
                    }
                })
                .catch((error: any) => {
                    console.error('❌ [SOCKET] Ready status error:', error);
                });
        }
    };

    // Cleanup validation timeouts on unmount
    useEffect(() => {
        return () => {
            Object.values(validationTimeoutRef.current).forEach(timeout => {
                if (timeout) clearTimeout(timeout);
            });
        };
    }, []);

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

                        {/* Player Avatars with Status-based Border Colors */}
                        <View style={styles.playersSection}>
                            <View style={styles.playersAvatarContainer}>
                                {/* Players Avatars */}
                                {currentRoom?.players?.map((player, index) => {
                                    const playerFromState = players.find(p => p.id === player.id);
                                    const itsMe = player.id === user?.id;

                                    // Use local board progress for current user, socket data for others
                                    const cellsCompleted = itsMe
                                        ? completedCells // Current user's actual local progress
                                        : (playerFromState?.cellsCompleted || 0); // Other players from socket events

                                    const status = getPlayerStatus(player, cellsCompleted);

                                    return (
                                        <View key={player.id} style={styles.playerAvatarWrapper}>
                                            <View style={[
                                                styles.playerAvatar,
                                                {
                                                    borderColor: getAvatarBorderColor(status),
                                                    borderWidth: 3,
                                                }
                                            ]}>
                                                <Text style={styles.avatarText}>
                                                    {player.avatar || player.username?.charAt(0)?.toUpperCase() || '👤'}
                                                </Text>
                                                <View style={styles.hostBadge}>
                                                    {player.isHost && (
                                                        <Icon name="award" size={10} color="#fbbf24" />

                                                    )}
                                                </View>
                                            </View>
                                            <Text style={styles.playerName}>{itsMe ? 'You' : player.username}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Timer - Compact Display */}
                        <View style={styles.compactTimer}>
                            <Icon
                                name="clock"
                                size={14}
                                color={timeLeft <= 60 ? '#dc2626' : '#8B4513'}
                            />
                            <Text style={[
                                styles.timerText,
                                timeLeft <= 60 && styles.dangerText
                            ]}>
                                {formatTime(timeLeft)}
                            </Text>

                            <Text style={styles.progressText}>
                                {validCells} / {totalCells}
                            </Text>
                        </View>

                        {/* Bingo Board - Clean Layout */}
                        <View style={styles.boardSection}>
                            <Card style={styles.boardCard}>
                                <CardContent style={styles.boardContent}>
                                    <View style={styles.bingoGrid}>
                                        {bingoBoard.map((row, rowIndex) => (
                                            <View key={rowIndex} style={styles.bingoRow}>
                                                {row.map((cell, colIndex) => (
                                                    <View key={cell.id} style={getCellStyle(cell)}>
                                                        <TextInput
                                                            ref={(ref) => {
                                                                if (!inputRefs.current[rowIndex]) {
                                                                    inputRefs.current[rowIndex] = [];
                                                                }
                                                                inputRefs.current[rowIndex][colIndex] = ref!;
                                                            }}
                                                            style={[
                                                                styles.cellInput,
                                                                cell.isFocused && styles.focusedInput,
                                                                cell.word && cell.isValid && styles.validInput,
                                                                cell.word && !cell.isValid && styles.invalidInput,
                                                            ]}
                                                            value={cell.word}
                                                            onChangeText={(text) => handleCellChange(rowIndex, colIndex, text)}
                                                            onFocus={() => handleCellFocus(rowIndex, colIndex)}
                                                            onBlur={() => handleCellBlur(rowIndex, colIndex)}
                                                            placeholder=""
                                                            multiline={false}
                                                            textAlign="center"
                                                            editable={timeLeft > 0} // Allow editing until timer expires
                                                            maxLength={10}
                                                        />

                                                        {/* Enhanced validation indicator */}
                                                        {cell.word && (
                                                            <View style={styles.validationIndicator}>
                                                                {cell.isValidating ? (
                                                                    <ActivityIndicator
                                                                        size="small"
                                                                        color="#3b82f6"
                                                                        style={styles.validationSpinner}
                                                                    />
                                                                ) : (
                                                                    <Icon
                                                                        name={cell.isValid ? "check" : "x"}
                                                                        size={12}
                                                                        color={cell.isValid ? "#22c55e" : "#ef4444"}
                                                                    />
                                                                )}
                                                            </View>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        ))}
                                    </View>
                                </CardContent>
                            </Card>
                        </View>


                        {/* Action Button - Only show when board is complete */}
                        {!isDone ? (
                            <View style={styles.actionSection}>
                                {allCellsValidAndFilled && (
                                    <Button
                                        onPress={handleDone}
                                        style={styles.doneButton}
                                        gradient={true}
                                        gradientColors={['#228b22', '#8b4513']}
                                    >
                                        <View style={styles.doneButtonContent}>
                                            <Icon name="check-circle" size={20} color="#ffffff" />
                                            <Text style={styles.doneButtonText}>I'm Done!</Text>
                                        </View>
                                    </Button>
                                )}
                            </View>
                        ) : (
                            <View style={styles.waitingSection}>
                                <Card style={styles.waitingCard}>
                                    <CardContent style={styles.waitingContent}>
                                        <View style={styles.waitingIconContainer}>
                                            <Icon name="users" size={32} color="#228b22" />
                                        </View>
                                        <Text style={styles.waitingTitle}>Board Complete! 🎉</Text>
                                        <Text style={styles.waitingMessage}>
                                            Waiting for other players to finish their boards...
                                        </Text>

                                        {/* Animated loading dots */}
                                        <View style={styles.loadingDots}>
                                            <View style={[styles.dot, styles.dot1]} />
                                            <View style={[styles.dot, styles.dot2]} />
                                            <View style={[styles.dot, styles.dot3]} />
                                        </View>

                                        <TouchableOpacity
                                            style={styles.editButton}
                                            onPress={() => {
                                                setIsDone(false);
                                                setIsWaiting(false);

                                                // Notify backend that player is no longer ready
                                                if (currentRoom?.id && user?.id) {
                                                    console.log('✏️ Player editing board - notifying backend not ready');
                                                    socketService.setPreGameReady(currentRoom.id, false);
                                                }
                                            }}
                                        >
                                            <Icon name="edit-2" size={16} color="#8b4513" />
                                            <Text style={styles.editButtonText}>Edit Board</Text>
                                        </TouchableOpacity>
                                    </CardContent>
                                </Card>
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
        fontSize: 18,
        fontWeight: 'bold',
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
    },
});