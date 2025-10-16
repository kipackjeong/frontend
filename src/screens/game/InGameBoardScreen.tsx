import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { InGameAvatarRow } from '../../components/game';
import { BingoBoard, BingoCell as StoreBingoCell } from '../../types';
import { useStore } from '../../store';
import { socketService } from '../../services/socket';

const CELL_SIZE = 60;
const GRID_SIZE = 5;
const GRID_GAP = 8;

// Simple in-game board renderer for the current user
// - Board is read-only (uneditable)
// - First tap highlights a cell (local only)
// - Second tap on the same cell submits the word to server

const InGameBoardScreen: React.FC = () => {
  const { user, currentPlayerBoard, boards, currentTurn, room, currentRoom, selectedChoseongPair, pregamePlayers, currentWord } = useStore();

  const myBoard: BingoBoard | null = useMemo(() => {
    if (currentPlayerBoard) return currentPlayerBoard;
    if (user?.id && boards?.length) {
      return boards.find(b => b.playerId === user.id) || null;
    }
    return null;
  }, [currentPlayerBoard, boards, user?.id]);

  const isMyTurn = useMemo(() => {
    if (!currentTurn || !user?.id) return false;
    return currentTurn.playerId === user.id && currentTurn.isActive;
  }, [currentTurn, user?.id]);

  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  const consonantText = useMemo(() => {
    return (selectedChoseongPair?.korean?.trim() || 'ㄱ');
  }, [selectedChoseongPair]);

  const timeRemaining = currentTurn?.timeRemaining ?? 0;

  const markedCount = useMemo(() => {
    if (!myBoard) return 0;
    return myBoard.cells.reduce((acc, row) => acc + row.filter(c => c.isMarked).length, 0);
  }, [myBoard]);

  // Grid dimensions for overlay math
  const gridSizePx = useMemo(() => GRID_SIZE * CELL_SIZE + (GRID_SIZE - 1) * GRID_GAP, []);

  // Compute completed lines
  const completedRows = useMemo(() => {
    if (!myBoard) return Array(GRID_SIZE).fill(false);
    return myBoard.cells.map(row => row.every(c => c.isMarked));
  }, [myBoard]);

  const completedCols = useMemo(() => {
    if (!myBoard) return Array(GRID_SIZE).fill(false);
    const cols: boolean[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      let all = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!myBoard.cells[r][c].isMarked) { all = false; break; }
      }
      cols.push(all);
    }
    return cols;
  }, [myBoard]);

  const diagMainComplete = useMemo(() => {
    if (!myBoard) return false;
    for (let i = 0; i < GRID_SIZE; i++) {
      if (!myBoard.cells[i][i].isMarked) return false;
    }
    return true;
  }, [myBoard]);

  const diagAntiComplete = useMemo(() => {
    if (!myBoard) return false;
    for (let i = 0; i < GRID_SIZE; i++) {
      if (!myBoard.cells[i][GRID_SIZE - 1 - i].isMarked) return false;
    }
    return true;
  }, [myBoard]);

  // Compute if each cell is part of a completed line
  const cellCompletedLines = useMemo(() => {
    if (!myBoard) return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
    const lines: boolean[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
    // Rows
    for (let r = 0; r < GRID_SIZE; r++) {
      if (completedRows[r]) {
        for (let c = 0; c < GRID_SIZE; c++) {
          lines[r][c] = true;
        }
      }
    }
    // Columns
    for (let c = 0; c < GRID_SIZE; c++) {
      if (completedCols[c]) {
        for (let r = 0; r < GRID_SIZE; r++) {
          lines[r][c] = true;
        }
      }
    }
    // Main diagonal
    if (diagMainComplete) {
      for (let i = 0; i < GRID_SIZE; i++) {
        lines[i][i] = true;
      }
    }
    // Anti diagonal
    if (diagAntiComplete) {
      for (let i = 0; i < GRID_SIZE; i++) {
        lines[i][GRID_SIZE - 1 - i] = true;
      }
    }
    return lines;
  }, [myBoard, completedRows, completedCols, diagMainComplete, diagAntiComplete]);
  // and finally fall back to pregamePlayers mapped to Player shape to ensure display.
  const playersList = useMemo(() => {
    const primary = (room?.players && room.players.length > 0) ? room.players : [];
    if (primary.length > 0) return primary;
    const secondary = (currentRoom?.players && currentRoom.players.length > 0) ? currentRoom.players : [];
    if (secondary.length > 0) return secondary;
    const fromPregame = (pregamePlayers || []).map(p => ({
      id: p.id,
      username: p.username,
      isHost: p.isHost,
      isReady: p.isReady,
      avatar: p.avatar,
      boardCompleted: p.boardCompleted,
    }));
    return fromPregame;
  }, [room?.players, currentRoom?.players, pregamePlayers]);

  const roomCode = useMemo(() => room?.code || (currentRoom as any)?.code || '', [room?.code, (currentRoom as any)?.code]);

  const handleSelectCell = useCallback((cell: StoreBingoCell) => {
    // Guard: must be my turn
    if (!isMyTurn) return;
    // Guard: cannot select empty or already-claimed
    if (!cell.word || !cell.word.trim()) return;
    if (cell.isMarked) return;

    if (selectedCellId === cell.id) {
      // Second tap => submit
      const activeRoomId = (room as any)?.id || (currentRoom as any)?.id;
      if (!user?.id || !myBoard || !activeRoomId) return;
      try {
        socketService.submitWord(activeRoomId, cell.word, user.id, cell.id);
        setSelectedCellId(null);
      } catch (e) {
        Alert.alert('Submission failed', 'Please try again.');
      }
    } else {
      // First tap => broadcast selection for blue highlight across devices and set currentWord
      const activeRoomId = (room as any)?.id || (currentRoom as any)?.id;
      if (!user?.id || !myBoard || !activeRoomId) return;
      try {
        socketService.selectWord(activeRoomId, cell.word, user.id);
      } catch { }
      (useStore.getState() as any).setCurrentWord?.(cell.word);
      setSelectedCellId(cell.id);
    }
  }, [isMyTurn, selectedCellId, user?.id, myBoard, room?.id]);

  if (!myBoard) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>Loading your board...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#FFFFFF', '#f5f1eb']} style={styles.backgroundGradient}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Consonant Badge */}
          <View style={styles.modernConsonantContainer}>
            <View style={styles.badgeWrapper}>
              <View style={styles.modernBadgeOuter}>
                <View style={styles.modernBadgeInner}>
                  <Text style={styles.modernConsonantText}>{consonantText}</Text>
                  <View style={styles.modernAccentLine} />
                </View>
              </View>
            </View>
          </View>

          {/* Players Avatar Row (In-Game) */}
          <InGameAvatarRow
            players={playersList}
            playersFromState={pregamePlayers || []}
            currentUserId={user?.id}
            completedCells={markedCount}
            isCurrentUserReady={false}
          />
          {roomCode ? (<Text style={styles.roomCodeText}>Room: {roomCode}</Text>) : null}

          {/* Header + Turn Info */}
          <View style={styles.headerRow}>
            <View style={styles.turnInfoRow}>
              <Text style={styles.turnInfo}>{isMyTurn ? 'Your turn' : 'Waiting...'}</Text>
              <View style={styles.compactTimer}>
                <Icon name="clock" size={14} color={timeRemaining <= 5 ? '#dc2626' : '#8B4513'} />
                <Text style={[styles.timerText, timeRemaining <= 5 && styles.dangerText]}>
                  {timeRemaining}s
                </Text>
                <Text style={styles.progressText}>{markedCount} / 25</Text>
              </View>
            </View>
          </View>

          {/* Board Card */}
          <View style={styles.boardSection}>
            <View style={styles.boardCard}>
              <View style={styles.boardContent}>
                <View style={StyleSheet.flatten([styles.gridWrapper, { width: gridSizePx, height: gridSizePx }])}>
                  <View style={styles.grid}>
                    {myBoard.cells.map((row, rIdx) => (
                      <View key={`r-${rIdx}`} style={styles.row}>
                        {row.map((cell, cIdx) => {
                          const isSelected = selectedCellId === cell.id;
                          const isHighlighted = (currentWord || '').toLowerCase() === (cell.word || '').toLowerCase() && !cell.isMarked;
                          return (
                            <TouchableOpacity
                              key={cell.id}
                              activeOpacity={0.8}
                              onPress={() => handleSelectCell(cell)}
                              style={StyleSheet.flatten([
                                styles.cell,
                                cell.isMarked && styles.cellClaimed,
                                isSelected && styles.cellSelected,
                                isHighlighted && styles.cellHighlighted,
                                (!isMyTurn || !cell.word || cell.isMarked) && styles.cellDisabled,
                                cellCompletedLines[rIdx]?.[cIdx] && styles.cellCompletedLine,
                              ])}
                            >
                              <Text style={StyleSheet.flatten([styles.word, cell.isMarked && styles.wordClaimed, cellCompletedLines[rIdx]?.[cIdx] && styles.wordCompletedLine])} numberOfLines={1}>
                                {cell.word || ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>

                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Layout
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  backgroundGradient: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  // Header & timer
  headerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  header: { fontSize: 20, fontWeight: '700', color: '#1f2937' },
  turnInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  turnInfo: { fontSize: 14, color: '#6b7280' },
  compactTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
    marginLeft: 8,
  },
  timerText: { fontSize: 14, fontWeight: '700', color: '#8B4513' },
  dangerText: { color: '#dc2626' },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },

  // Badge (aligned with pre-game modern badge)
  modernConsonantContainer: { alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 },
  badgeWrapper: { alignItems: 'center', justifyContent: 'center' },
  modernBadgeOuter: {
    borderRadius: 24,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modernBadgeInner: {
    width: 100,
    height: 100,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f5f1eb',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  modernConsonantText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#2d2016',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: -1,
  },
  modernAccentLine: { width: 30, height: 2, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 1, marginTop: 4 },

  // Board card & grid
  boardSection: { marginTop: 8, marginBottom: 16 },
  boardCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(139, 69, 19, 0.2)',
    shadowColor: '#2d2016',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  boardContent: { padding: 16 },
  grid: { gap: GRID_GAP },
  gridWrapper: { position: 'relative', alignSelf: 'center' },
  row: { flexDirection: 'row', gap: GRID_GAP, justifyContent: 'center' },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cellSelected: { borderColor: '#f59e0b', backgroundColor: '#fff7ed' },
  cellHighlighted: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  cellClaimed: { backgroundColor: '#f0fdf4', borderColor: '#22c55e' },
  cellDisabled: { opacity: 0.6 },
  cellCompletedLine: { backgroundColor: '#10b981', borderColor: '#059669', shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  word: { fontSize: 12, fontWeight: '700', color: '#2d2016' },
  wordClaimed: { color: '#15803d' },
  wordCompletedLine: { color: '#ffffff', fontWeight: '800', textShadowColor: 'rgba(0, 0, 0, 0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  // Legend
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#6b7280', marginRight: 8 },
  roomCodeText: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginBottom: 6 },
});

export { InGameBoardScreen };
