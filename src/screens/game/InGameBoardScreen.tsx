import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, SafeAreaView, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import { useStore } from '../../store';
import { BingoBoard, BingoCell as StoreBingoCell } from '../../types';
import { socketService } from '../../services/socket';

// Simple in-game board renderer for the current user
// - Board is read-only (uneditable)
// - First tap highlights a cell (local only)
// - Second tap on the same cell submits the word to server

const CELL_SIZE = 60;

const InGameBoardScreen: React.FC = () => {
  const { user, currentPlayerBoard, boards, currentTurn, room } = useStore();

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

  const handleSelectCell = useCallback((cell: StoreBingoCell) => {
    // Guard: must be my turn
    if (!isMyTurn) return;
    // Guard: cannot select empty or already-claimed
    if (!cell.word || !cell.word.trim()) return;
    if (cell.isMarked) return;

    if (selectedCellId === cell.id) {
      // Second tap => submit
      if (!user?.id || !myBoard || !room?.id) return;
      try {
        socketService.submitWord(room.id, cell.word, user.id, cell.id);
        setSelectedCellId(null);
      } catch (e) {
        Alert.alert('Submission failed', 'Please try again.');
      }
    } else {
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
      <View style={styles.headerRow}>
        <Text style={styles.header}>In-Game Board</Text>
        <Text style={styles.turnInfo}>
          {isMyTurn ? 'Your turn' : 'Waiting...'} {currentTurn ? `(${currentTurn.timeRemaining}s)` : ''}
        </Text>
      </View>

      <View style={styles.grid}>
        {myBoard.cells.map((row, rIdx) => (
          <View key={`r-${rIdx}`} style={styles.row}>
            {row.map((cell) => {
              const isSelected = selectedCellId === cell.id;
              return (
                <TouchableOpacity
                  key={cell.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectCell(cell)}
                  style={[
                    styles.cell,
                    cell.isMarked && styles.cellClaimed,
                    isSelected && styles.cellSelected,
                    (!isMyTurn || !cell.word || cell.isMarked) && styles.cellDisabled,
                  ]}
                >
                  <Text style={[styles.word, cell.isMarked && styles.wordClaimed]} numberOfLines={1}>
                    {cell.word || ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: '#bfdbfe' }]} />
        <Text style={styles.legendText}>Claimed word</Text>
        <View style={[styles.legendDot, { backgroundColor: '#93c5fd' }]} />
        <Text style={styles.legendText}>Selected word (your view only)</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  header: { fontSize: 20, fontWeight: '700', color: '#1f2937' },
  turnInfo: { fontSize: 14, color: '#6b7280' },
  grid: { gap: 8 },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
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
  cellSelected: { borderColor: '#3b82f6', backgroundColor: '#dbeafe' },
  cellClaimed: { backgroundColor: '#bfdbfe', borderColor: '#60a5fa' },
  cellDisabled: { opacity: 0.6 },
  word: { fontSize: 12, fontWeight: '700', color: '#111827' },
  wordClaimed: { color: '#1e3a8a' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 16 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#6b7280', marginRight: 8 },
});

export { InGameBoardScreen };
