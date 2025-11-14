import React, { useRef } from 'react';
import {
  View,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { CELL_SIZE, GRID_GAP, BORDER_RADIUS, BORDER_COLOR, CARD_BORDER_COLOR, CARD_BORDER_WIDTH } from './bingoTheme';
import type { BingoCell } from '../../hooks/useBingoBoard';
const RNIcon: any = Icon;
import { SKIA_CONFIG } from '../../constants/config';
import BingoBoardSkiaOverlay from '../skia/BingoBoardSkiaOverlay';

interface BingoGridProps {
  bingoBoard: BingoCell[][];
  timeLeft: number;
  getCellStyle: (cell: BingoCell) => any[];
  onCellChange: (rowIndex: number, colIndex: number, text: string) => void;
  onCellFocus: (rowIndex: number, colIndex: number) => void;
  onCellBlur: (rowIndex: number, colIndex: number) => void;
  editable?: boolean;
}

const BingoGrid = ({
  bingoBoard,
  timeLeft,
  getCellStyle,
  onCellChange,
  onCellFocus,
  onCellBlur,
  editable = true,
}: BingoGridProps) => {
  const inputRefs = useRef<TextInput[][]>([]);
  const rows = bingoBoard.length;
  const cols = bingoBoard[0]?.length ?? 5;
  const gridSizePx = cols * CELL_SIZE + (cols - 1) * GRID_GAP;

  const focusCell = (row: number, col: number) => {
    const ref = inputRefs.current[row]?.[col];
    if (ref && typeof ref.focus === 'function') {
      ref.focus();
    }
  };

  const moveToNext = (row: number, col: number) => {
    const idx = row * cols + col;
    const nextIdx = idx + 1;
    if (nextIdx < rows * cols) {
      const nextRow = Math.floor(nextIdx / cols);
      const nextCol = nextIdx % cols;
      focusCell(nextRow, nextCol);
    } else {
      const ref = inputRefs.current[row]?.[col];
      if (ref && typeof ref.blur === 'function') ref.blur();
    }
  };

  return (
    <View style={styles.boardSection}>
      <View style={styles.boardCard}>
        <View style={styles.boardContent}>
          <View style={StyleSheet.flatten([styles.gridWrapper, { width: gridSizePx, height: gridSizePx }])}>
            <View style={styles.bingoGrid}>
            {bingoBoard.map((row: BingoCell[], rowIndex: number) => (
              <View key={rowIndex} style={styles.bingoRow}>
                {row.map((cell: BingoCell, colIndex: number) => (
                  <Pressable
                    key={cell.id}
                    style={styles.cellContainer}
                    onPress={() => {
                      if (timeLeft > 0 && editable) {
                        focusCell(rowIndex, colIndex);
                      }
                    }}
                    disabled={!(timeLeft > 0 && editable)}
                    accessibilityRole="button"
                    accessibilityLabel={`Cell ${rowIndex + 1}, ${colIndex + 1}`}
                  >
                    <TextInput
                      ref={(ref) => {
                        if (!inputRefs.current[rowIndex]) {
                          inputRefs.current[rowIndex] = [];
                        }
                        inputRefs.current[rowIndex][colIndex] = ref!;
                      }}
                      style={StyleSheet.flatten([
                        styles.cellInput,
                        cell.isFocused && styles.focusedInput,
                        cell.word && cell.isValid && styles.validInput,
                        cell.word && !cell.isValid && styles.invalidInput,
                      ])}
                      value={cell.word}
                      onChangeText={(text) => onCellChange(rowIndex, colIndex, text)}
                      onFocus={() => onCellFocus(rowIndex, colIndex)}
                      onBlur={() => onCellBlur(rowIndex, colIndex)}
                      placeholder=""
                      multiline={false}
                      textAlign="center"
                      editable={timeLeft > 0 && editable} // Allow editing until timer expires and not locked by confirm
                      maxLength={10}
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => moveToNext(rowIndex, colIndex)}
                      selectTextOnFocus
                    />

                    {/* Enhanced validation indicator */}
                    {cell.word && (
                      <View style={styles.validationIndicator} pointerEvents="none">
                        {cell.isValidating ? (
                          <ActivityIndicator
                            size="small"
                            color="#3b82f6"
                            style={styles.validationSpinner}
                          />
                        ) : (
                          <RNIcon
                            name={cell.isValid ? "check" : "x"}
                            size={12}
                            color={cell.isValid ? "#22c55e" : "#ef4444"}
                          />
                        )}
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            ))}
            </View>
            {SKIA_CONFIG.USE_SKIA_BOARD && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <BingoBoardSkiaOverlay size={gridSizePx} gridSize={cols} gap={GRID_GAP} theme="physical" />
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  boardSection: {
    marginBottom: 24,
  },
  boardCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: CARD_BORDER_COLOR,
    shadowColor: '#2d2016',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  boardContent: {
    padding: 16,
  },
  gridWrapper: { position: 'relative', alignSelf: 'center' },
  bingoGrid: {
    flexDirection: 'column',
    gap: GRID_GAP,
  },
  bingoRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    justifyContent: 'center',
  },
  cellContainer: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS,
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    elevation: 4,
    shadowColor: '#2d2016',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cellInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d2016',
    textAlign: 'center',
    backgroundColor: 'transparent',
    minHeight: 40,
    paddingVertical: 4,
    width: '100%',
    height: '100%',
    paddingHorizontal: 8,
  },
  focusedInput: {
    color: '#1f2937',
  },
  validInput: {
    color: '#059669',
    fontWeight: 'bold',
  },
  invalidInput: {
    color: '#dc2626',
  },
  validationIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 1,
  },
  validationSpinner: {
    width: 14,
    height: 14,
  },
});

export default BingoGrid;