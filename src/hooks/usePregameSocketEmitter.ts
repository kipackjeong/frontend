import { useRef, useCallback } from 'react';
import { socketService } from '../services/socket';
import type { BingoCell } from './useBingoBoard';

interface UsePregameSocketEmitterProps {
    user: any;
    roomId: string;
    allCellsValidAndFilled: boolean;
    bingoBoard: BingoCell[][];
    currentConsonant: string;
}

interface UsePregameSocketEmitterReturn {
    sendBoardProgressUpdate: (cellsCompleted: number, force?: boolean) => void;
    sendCompletionStatus: (isReady: boolean) => Promise<{ success: boolean; message?: string }>;
}

const SOCKET_UPDATE_DEBOUNCE_MS = 2000; // 2 seconds debounce for board updates

export function usePregameSocketEmitter({
    user,
    roomId,
    allCellsValidAndFilled,
    bingoBoard,
    currentConsonant,
}: UsePregameSocketEmitterProps): UsePregameSocketEmitterReturn {
    // Socket update optimization - debounce board updates
    const socketUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSocketUpdate = useRef({ cellsCompleted: 0, timestamp: 0 });

    /**
     * Send debounced board progress updates to other players
     * Only sends updates if cellsCompleted changed and after debounce delay
     */
    const sendBoardProgressUpdate = useCallback((cellsCompleted: number, force: boolean = false) => {
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

            const boardData = {
                board: bingoBoard,
                completedCells: cellsCompleted,
                timestamp: new Date().toISOString(),
                playerId: user.id,
                consonant: currentConsonant,
            };

            socketService.updatePregameBoardStatus(
                roomId,
                user.id,
                cellsCompleted,
                25,
                isComplete,
                boardData
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
    }, [user?.id, roomId, allCellsValidAndFilled]);

    /**
     * Send immediate completion status to other players
     */
    const sendCompletionStatus = useCallback((isReady: boolean) => {
        if (user?.id && roomId) {
            const boardData = {
                board: bingoBoard,
                completedCells: bingoBoard.flat().filter(cell => (cell.word || (cell as any).previousWord) !== '').length,
                timestamp: new Date().toISOString(),
                playerId: user.id,
                consonant: currentConsonant
            };

            return socketService.setPreGameReady(roomId, isReady, boardData)
                .then((response: { success: boolean; message?: string }) => {
                    if (response.success) {
                        console.log(`✅ [SOCKET] Ready status updated: ${isReady}`);
                    } else {
                        console.error('❌ [SOCKET] Failed to update ready status:', response.message);
                    }
                    return response;
                })
                .catch((error: any) => {
                    console.error('❌ [SOCKET] Ready status error:', error);
                    return { success: false, message: String(error) };
                });
        }
        return Promise.resolve({ success: false, message: 'Missing user or roomId' });
    }, [user?.id, roomId, bingoBoard, currentConsonant]);

    return {
        sendBoardProgressUpdate,
        sendCompletionStatus,
    };
}
