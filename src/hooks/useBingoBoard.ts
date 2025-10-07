import { useState, useRef, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { koreanDictionaryService, WordValidationResult } from '../services/koreanDictionary';

export interface BingoCell {
    id: string;
    word: string;
    isValid: boolean;
    isFocused: boolean;
    isValidating?: boolean;
    validationError?: string;
    definition?: string;
    previousWord?: string; // Store previous word for timer fallback
}

interface UseBingoBoardReturn {
    bingoBoard: BingoCell[][];
    setBingoBoard: React.Dispatch<React.SetStateAction<BingoCell[][]>>;
    completedCells: number;
    validCells: number;
    hasDuplicates: boolean;
    allCellsValidAndFilled: boolean;
    handleCellChange: (rowIndex: number, colIndex: number, text: string) => void;
    handleCellFocus: (rowIndex: number, colIndex: number) => void;
    handleCellBlur: (rowIndex: number, colIndex: number) => void;
    getCellStyle: (cell: BingoCell) => any[];
    handleTimerExpired: () => void;
    isDuplicateWord: (word: string, currentRowIndex: number, currentColIndex: number) => boolean;
    // New API for post-confirm editing
    setConfirmedSnapshotFromBoard: (board: BingoCell[][]) => void;
    setPostConfirmEditMode: (enabled: boolean) => void;
    postConfirmEditMode: boolean;
}

export function useBingoBoard(currentConsonant: string, styles: any): UseBingoBoardReturn {
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

    // Immutable snapshot captured on first confirm, used for post-confirm edits fallback
    const [confirmedSnapshot, setConfirmedSnapshot] = useState<string[][] | null>(null);
    const [postConfirmEditMode, setPostConfirmEditMode] = useState<boolean>(false);

    // Debounced validation timeout ref
    const validationTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

    // Memoized calculations
    const completedCells = useMemo(() => {
        return bingoBoard.flat().filter(cell => cell.word !== '').length;
    }, [bingoBoard]);

    const validCells = useMemo(() => {
        return bingoBoard.flat().filter(cell => cell.word !== '' && cell.isValid).length;
    }, [bingoBoard]);

    const hasDuplicates = useMemo(() => {
        const allWords = bingoBoard.flat().map(cell => cell.word.trim().toLowerCase()).filter(word => word !== '');
        const uniqueWords = new Set(allWords);
        return allWords.length !== uniqueWords.size;
    }, [bingoBoard]);

    const allCellsValidAndFilled = useMemo(() => {
        const totalCells = 25;
        return validCells === totalCells && !hasDuplicates;
    }, [validCells, hasDuplicates]);

    // Check if a word is duplicated elsewhere on the board
    const isDuplicateWord = useCallback((word: string, currentRowIndex: number, currentColIndex: number): boolean => {
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
    }, [bingoBoard]);

    // Real-time word validation using Korean Dictionary API
    const validateWordAsync = useCallback(async (word: string, rowIndex: number, colIndex: number): Promise<void> => {
        console.log(`🔍 Validating word: "${word}" at position ${rowIndex}-${colIndex}`);

        if (!word || word.trim() === '') {
            // Empty input
            if (postConfirmEditMode && confirmedSnapshot) {
                // Revert to confirmed snapshot for this cell only
                const fallbackWord = confirmedSnapshot[rowIndex]?.[colIndex] ?? '';
                setBingoBoard(prev => {
                    const newBoard = [...prev];
                    newBoard[rowIndex][colIndex] = {
                        ...newBoard[rowIndex][colIndex],
                        word: fallbackWord,
                        isValid: true,
                        isValidating: false,
                        validationError: undefined,
                        definition: undefined,
                    };
                    return newBoard;
                });
            } else {
                // Empty word - clear validation state
                setBingoBoard(prev => {
                    const newBoard = [...prev];
                    newBoard[rowIndex][colIndex] = {
                        ...newBoard[rowIndex][colIndex],
                        isValid: false,
                        isValidating: false,
                        validationError: undefined,
                        definition: undefined,
                    };
                    return newBoard;
                });
            }
            return;
        }

        // Check for duplicates first
        if (isDuplicateWord(word, rowIndex, colIndex)) {
            console.log(`🔄 Duplicate word detected: "${word}"`);
            // If editing after confirm and we have a snapshot, revert this cell to snapshot
            if (postConfirmEditMode && confirmedSnapshot) {
                const fallbackWord = confirmedSnapshot[rowIndex]?.[colIndex] ?? '';
                setBingoBoard(prev => {
                    const newBoard = [...prev];
                    newBoard[rowIndex][colIndex] = {
                        ...newBoard[rowIndex][colIndex],
                        word: fallbackWord,
                        isValid: true,
                        isValidating: false,
                        validationError: undefined,
                        definition: undefined,
                    };
                    return newBoard;
                });
            } else {
                setBingoBoard(prev => {
                    const newBoard = [...prev];
                    newBoard[rowIndex][colIndex] = {
                        ...newBoard[rowIndex][colIndex],
                        isValid: false,
                        isValidating: false,
                        validationError: 'This word is already used on the board',
                        definition: undefined,
                    };
                    return newBoard;
                });
            }
            return;
        }

        // Set loading state
        setBingoBoard(prev => {
            const newBoard = [...prev];
            newBoard[rowIndex][colIndex] = {
                ...newBoard[rowIndex][colIndex],
                isValidating: true,
                validationError: undefined,
            };
            return newBoard;
        });

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
            if (!result.isValid && postConfirmEditMode && confirmedSnapshot) {
                // Revert this single cell to confirmed snapshot
                const fallbackWord = confirmedSnapshot[rowIndex]?.[colIndex] ?? '';
                setBingoBoard(prev => {
                    const updatedBoard = [...prev];
                    updatedBoard[rowIndex][colIndex] = {
                        ...updatedBoard[rowIndex][colIndex],
                        word: fallbackWord,
                        isValid: true,
                        isValidating: false,
                        validationError: undefined,
                        definition: undefined,
                    };
                    return updatedBoard;
                });
            } else {
                setBingoBoard(prev => {
                    const updatedBoard = [...prev];
                    updatedBoard[rowIndex][colIndex] = {
                        ...updatedBoard[rowIndex][colIndex],
                        isValid: result.isValid,
                        isValidating: false,
                        validationError: result.error,
                        definition: result.definition,
                    };
                    return updatedBoard;
                });
            }

        } catch (error) {
            console.error('❌ Word validation failed:', error);

            // Update board with error state (fallback to snapshot if editing after confirm)
            if (postConfirmEditMode && confirmedSnapshot) {
                const fallbackWord = confirmedSnapshot[rowIndex]?.[colIndex] ?? '';
                setBingoBoard(prev => {
                    const errorBoard = [...prev];
                    errorBoard[rowIndex][colIndex] = {
                        ...errorBoard[rowIndex][colIndex],
                        word: fallbackWord,
                        isValid: true,
                        isValidating: false,
                        validationError: undefined,
                    };
                    return errorBoard;
                });
            } else {
                setBingoBoard(prev => {
                    const errorBoard = [...prev];
                    errorBoard[rowIndex][colIndex] = {
                        ...errorBoard[rowIndex][colIndex],
                        isValid: false,
                        isValidating: false,
                        validationError: 'Validation failed',
                    };
                    return errorBoard;
                });
            }
        }
    }, [currentConsonant, isDuplicateWord, postConfirmEditMode, confirmedSnapshot]);

    // Debounced validation to avoid too many API calls
    const debouncedValidation = useCallback((word: string, rowIndex: number, colIndex: number) => {
        const cellKey = `${rowIndex}-${colIndex}`;

        // Clear existing timeout for this cell
        if (validationTimeoutRef.current[cellKey]) {
            clearTimeout(validationTimeoutRef.current[cellKey]);
        }

        // Set new timeout for validation (500ms delay)
        validationTimeoutRef.current[cellKey] = setTimeout(() => {
            validateWordAsync(word, rowIndex, colIndex);
        }, 500);
    }, [validateWordAsync]);

    const handleCellChange = useCallback((rowIndex: number, colIndex: number, text: string) => {
        setBingoBoard(prev => {
            const newBoard = [...prev];
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

            return newBoard;
        });

        // Trigger debounced validation
        debouncedValidation(text, rowIndex, colIndex);
    }, [debouncedValidation]);

    const handleCellFocus = useCallback((rowIndex: number, colIndex: number) => {
        setBingoBoard(prev => {
            const newBoard = [...prev];
            // Reset all focus states
            newBoard.forEach(row => {
                row.forEach(cell => {
                    cell.isFocused = false;
                });
            });
            // Set current cell as focused
            newBoard[rowIndex][colIndex].isFocused = true;
            return newBoard;
        });
    }, []);

    const handleCellBlur = useCallback((rowIndex: number, colIndex: number) => {
        setBingoBoard(prev => {
            const newBoard = [...prev];
            newBoard[rowIndex][colIndex].isFocused = false;
            return newBoard;
        });
    }, []);

    const getCellStyle = useCallback((cell: BingoCell) => {
        if (cell.isFocused) return [styles.bingoCell, styles.focusedCell];
        if (cell.isValidating) return [styles.bingoCell, styles.validatingCell];
        if (cell.word && cell.isValid) return [styles.bingoCell, styles.validCell];
        if (cell.word && !cell.isValid) return [styles.bingoCell, styles.invalidCell];
        return [styles.bingoCell]; // Always return array for consistency
    }, [styles]);

    // Handle timer expiration - fallback editing cells to previous words
    const handleTimerExpired = useCallback(() => {
        setBingoBoard(prev => {
            const newBoard = [...prev];
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

            return hasChanges ? newBoard : prev;
        });

        // Clear any pending validation timeouts
        Object.values(validationTimeoutRef.current).forEach(timeout => {
            if (timeout) clearTimeout(timeout);
        });
        validationTimeoutRef.current = {};

        Alert.alert(
            'Time\'s Up!',
            'Time limit reached. Any incomplete edits have been reverted to previous words.',
            [{ text: 'OK' }]
        );
    }, []);

    return {
        bingoBoard,
        setBingoBoard,
        completedCells,
        validCells,
        hasDuplicates,
        allCellsValidAndFilled,
        handleCellChange,
        handleCellFocus,
        handleCellBlur,
        getCellStyle,
        handleTimerExpired,
        isDuplicateWord,
        setConfirmedSnapshotFromBoard: (board: BingoCell[][]) => {
            // Only capture once per session
            setConfirmedSnapshot(prev => prev ?? board.map(r => r.map(c => c.word)));
            setPostConfirmEditMode(false);
        },
        setPostConfirmEditMode,
        postConfirmEditMode,
    };
}
