import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socket';
import { Player } from '../types';
import logger from '../utils/logger';

export interface PreGamePlayer extends Player {
    boardCompleted: boolean;
    cellsCompleted: number;
}

interface UseSocketEventsProps {
    roomId: string;
    currentRoom: any;
    user: any;
}

interface UseSocketEventsReturn {
    players: PreGamePlayer[];
    setPlayers: React.Dispatch<React.SetStateAction<PreGamePlayer[]>>;
}

export function useSocketEvents({ roomId, currentRoom, user }: UseSocketEventsProps): UseSocketEventsReturn {
    const [players, setPlayers] = useState<PreGamePlayer[]>([]);

    // Initialize players state with room players on mount
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
            // Initialize players state with current room players
            const initialPlayers: PreGamePlayer[] = currentRoom.players.map((player: any) => ({
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
    }, []);

    const handlePlayerReadyUpdated = useCallback((data: {
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
    }, []);

    const handlePlayerBoardCompleted = useCallback((data: {
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
    }, []);

    // Setup socket connection and event listeners
    useEffect(() => {
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
    }, [roomId, handlePlayerBoardUpdated, handlePlayerReadyUpdated, handlePlayerBoardCompleted, currentRoom?.code, user?.id]);

    return {
        players,
        setPlayers,
    };
}
