import React, { useRef } from 'react';
import {
    View,
    TextInput,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Card, CardContent } from '../common';
import type { BingoCell } from '../../hooks/useBingoBoard';

interface BingoGridProps {
    bingoBoard: BingoCell[][];
    timeLeft: number;
    getCellStyle: (cell: BingoCell) => any[];
    onCellChange: (rowIndex: number, colIndex: number, text: string) => void;
    onCellFocus: (rowIndex: number, colIndex: number) => void;
    onCellBlur: (rowIndex: number, colIndex: number) => void;
}

const BingoGrid: React.FC<BingoGridProps> = ({
    bingoBoard,
    timeLeft,
    getCellStyle,
    onCellChange,
    onCellFocus,
    onCellBlur,
}) => {
    const inputRefs = useRef<TextInput[][]>([]);

    return (
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
                                            onChangeText={(text) => onCellChange(rowIndex, colIndex, text)}
                                            onFocus={() => onCellFocus(rowIndex, colIndex)}
                                            onBlur={() => onCellBlur(rowIndex, colIndex)}
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
    );
};

const styles = StyleSheet.create({
    boardSection: {
        marginBottom: 24,
    },
    boardCard: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 6,
    },
    boardContent: {
        padding: 16,
    },
    bingoGrid: {
        flexDirection: 'column',
        gap: 8,
    },
    bingoRow: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
    },
    cellInput: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        backgroundColor: 'transparent',
        minHeight: 40,
        paddingVertical: 4,
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