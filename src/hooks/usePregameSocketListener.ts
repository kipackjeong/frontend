import { useEffect, useCallback } from 'react';
import { socketService } from '../services/socket';
import { Player, PreGamePlayer } from '../types';
import logger from '../utils/logger';
import useStore, { usePregameActions, usePregamePlayers, usePregameRoomId } from '../store';

// Using shared PreGamePlayer type from types

interface UsePregameSocketListenerProps {
    roomId: string;
    currentRoom: any;
    user: any;
}

interface UsePregameSocketListenerReturn {
    players: PreGamePlayer[];
}

export function usePregameSocketListener({ roomId, currentRoom, user }: UsePregameSocketListenerProps): UsePregameSocketListenerReturn {
    const players = usePregamePlayers();
    const pregameRoomId = usePregameRoomId();
    const {
        initPregame,
        updatePlayerProgress,
        updatePlayerReady,
        upsertPregamePlayer,
        syncFromRoomPlayers,
        clearPregame,
    } = usePregameActions();

    // Initialize players state with room players on mount and keep in sync on changes
    useEffect(() => {
        logger.debug(`🏠 [INIT] Initializing players from room:`, currentRoom?.players?.map((p: any) => ({ id: p.id, username: p.username })));

        // 🔍 DEBUG: Comprehensive room state debugging
        logger.debug(`🔍 [ROOM_DEBUG] Full currentRoom state:`, {
            roomExists: !!currentRoom,
            roomId: currentRoom?.id,
            roomCode: currentRoom?.code,
            playerCount: currentRoom?.players?.length || 0,
            players: currentRoom?.players?.map((p: any) => ({ id: p.id, username: p.username, isHost: p.isHost })),
            roomStatus: currentRoom?.status
        });

        logger.debug(`🔍 [PARAMS_DEBUG] Route params:`, {
            routeRoomId: roomId,
            paramsMatch: roomId === currentRoom?.id
        });

        if (currentRoom?.players) {
            // If entering a new room's pregame, re-initialize cleanly
            if (pregameRoomId && pregameRoomId !== roomId) {
                clearPregame();
            }

            if (!players || players.length === 0 || pregameRoomId !== roomId) {
                // First time: initialize
                initPregame(roomId, currentRoom.players as Player[]);
                logger.debug(`✅ [INIT] Successfully initialized ${currentRoom.players.length} players`);
            } else {
                // Subsequent updates: sync without losing progress
                syncFromRoomPlayers(currentRoom.players as Player[]);
                logger.debug(`🔄 [SYNC] Synced pregame players from room update`);
            }
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
    }, [currentRoom?.players, roomId, initPregame, syncFromRoomPlayers, players?.length, pregameRoomId, clearPregame]);

    // Socket event handlers
    const handlePlayerBoardUpdated = useCallback((data: {
        playerId: string;
        cellsCompleted: number;
        totalCells: number;
        isComplete: boolean;
        completionPercentage: number;
        timestamp: string;
    }) => {
        logger.debug(`📡 [SOCKET] Received board update from ${data.playerId}: ${data.cellsCompleted}/${data.totalCells} cells`)
        console.log(`🔄 [AVATAR_SYNC] Updating avatar status for player ${data.playerId} -> ${data.cellsCompleted} cells`);
        // Primary: update progress for existing players
        updatePlayerProgress(data.playerId, data.cellsCompleted, data.isComplete);
        // Fallback: ensure player exists in store (in case they joined mid-phase)
        upsertPregamePlayer({
            id: data.playerId,
            username: `Player_${data.playerId.slice(-6)}`,
            isHost: false,
            isReady: data.isComplete,
            avatar: '👤',
            boardCompleted: data.isComplete,
            cellsCompleted: data.cellsCompleted,
        });
    }, []);

    const handlePlayerReadyUpdated = useCallback((data: {
        playerId: string;
        isReady: boolean;
        boardData?: any;
        timestamp: string;
    }) => {
        console.log(`📡 [SOCKET] Player ready status updated: ${data.playerId} -> ${data.isReady}`);
        // Update in store
        updatePlayerReady(data.playerId, data.isReady, Date.parse(data.timestamp) || Date.now());
        upsertPregamePlayer({
            id: data.playerId,
            username: `Player_${data.playerId.slice(-6)}`,
            isHost: false,
            isReady: data.isReady,
            avatar: '👤',
            boardCompleted: false,
            cellsCompleted: 0,
            lastUpdatedAt: Date.parse(data.timestamp) || Date.now(),
        });

        // If all players are ready, request server to start game (idempotent on server)
        try {
            const allReady = useStore.getState().allReady();
            if (allReady && roomId) {
                const order = useStore.getState().getConfirmedOrder();
                console.log('🚀 [PREGAME] All players ready. Requesting game start with order:', order);
                socketService.emit('pregame:request_game_start', { roomId, reason: 'all_ready', confirmedOrder: order });
            }
        } catch (e) {
            console.error('❌ [PREGAME] Failed to request game start:', e);
        }
    }, []);

    const handlePlayerBoardCompleted = (data: {
        playerId: string;
        completedCells: number;
        consonant: string;
        timestamp: string;
    }) => {
        console.log(`🎉 [SOCKET] Player completed board: ${data.playerId}`);
        // Update in store
        updatePlayerProgress(data.playerId, data.completedCells, true, Date.parse(data.timestamp) || Date.now());
        updatePlayerReady(data.playerId, true, Date.parse(data.timestamp) || Date.now());
        upsertPregamePlayer({
            id: data.playerId,
            username: `Player_${data.playerId.slice(-6)}`,
            isHost: false,
            isReady: true,
            avatar: '👤',
            boardCompleted: true,
            cellsCompleted: data.completedCells,
            lastUpdatedAt: Date.parse(data.timestamp) || Date.now(),
        });

        try {
            const allReady = useStore.getState().allReady();
            if (allReady && roomId) {
                const order = useStore.getState().getConfirmedOrder();
                console.log('🚀 [PREGAME] All players ready after completion. Requesting game start');
                socketService.emit('pregame:request_game_start', { roomId, reason: 'all_ready', confirmedOrder: order });
            }
        } catch (e) {
            console.error('❌ [PREGAME] Failed to request game start after completion:', e);
        }
    };

    // Setup socket connection and event listeners
    useEffect(() => {
        const setupSocketConnection = async () => {
            try {
                if (!socketService.isConnected() && user?.id) {
                    console.log('🔌 [AVATAR_SYNC] Connecting socket for real-time sync...');
                    await socketService.connect(user.id);
                }

                // Standardize on roomId channel joining
                if (roomId && user?.id) {
                    console.log('🏠 [AVATAR_SYNC] Joining room channel by ID:', roomId);
                    socketService.emit('room:join_channel', roomId, (response: any) => {
                        console.log('🏠 [SOCKET] room:join_channel ack:', response);
                    });
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
    }, [roomId, handlePlayerBoardUpdated, handlePlayerReadyUpdated, handlePlayerBoardCompleted, user?.id]);

    return {
        players,
    };
}
