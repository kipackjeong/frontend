/**
 * Board slice for Zustand store
 * Manages bingo board state and line detection
 */

import { StateCreator } from 'zustand';
import { BingoBoard, BingoCell, BingoLine } from '../../types';

export interface BoardSlice {
  // State
  boards: BingoBoard[];
  currentPlayerBoard: BingoBoard | null;
  completedLines: BingoLine[];
  currentWord: string;
  validationErrors: Record<string, string>; // cellId -> error message
  lineCountsByPlayerId?: Record<string, number>;
  // Server-authoritative ranking
  finishOrder?: string[];
  ranksByPlayerId?: Record<string, number>;
  
  // Actions
  createBoard: (playerId: string) => void;
  updateCell: (cellId: string, word: string) => void;
  markCell: (cellId: string, word: string) => void;
  validateBoard: (boardId: string) => boolean;
  detectCompletedLines: (boardId: string) => BingoLine[];
  clearValidationErrors: () => void;
  resetBoard: (playerId: string) => void;
  setCurrentWord: (word: string) => void;
  getAllBoards: () => BingoBoard[];
  setInGameBoards: (frozenBoards: Record<string, string[][]>) => void;
  setLineCountsByPlayerId: (counts: Record<string, number>) => void;
  setRanking: (finishOrder: string[], ranks: Record<string, number>) => void;
  resetRanking: () => void;
}

// Mock Korean words for development
const mockKoreanWords = [
  '가방', '나무', '다리', '라면', '마음', 
  '바다', '사과', '아이', '자동차', '차나무',
  '카드', '타임', '파도', '하늘', '감자',
  '갈비', '강물', '개구리', '거북이', '고양이'
];

// Helper function to get Korean initial consonant (초성)
const getChoseong = (word: string): string => {
  const choseongMap: Record<string, string> = {
    'ㄱ': 'ㄱ', 'ㄲ': 'ㄱ', 'ㄴ': 'ㄴ', 'ㄷ': 'ㄷ', 'ㄸ': 'ㄷ',
    'ㄹ': 'ㄹ', 'ㅁ': 'ㅁ', 'ㅂ': 'ㅂ', 'ㅃ': 'ㅂ', 'ㅅ': 'ㅅ',
    'ㅆ': 'ㅅ', 'ㅇ': 'ㅇ', 'ㅈ': 'ㅈ', 'ㅉ': 'ㅈ', 'ㅊ': 'ㅊ',
    'ㅋ': 'ㅋ', 'ㅌ': 'ㅌ', 'ㅍ': 'ㅍ', 'ㅎ': 'ㅎ'
  };
  
  if (!word || word.length === 0) return '';
  
  const firstChar = word[0];
  const charCode = firstChar.charCodeAt(0);
  
  if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
    // Korean syllable
    const choseongIndex = Math.floor((charCode - 0xAC00) / 588);
    const choseongChars = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    return choseongChars[choseongIndex] || '';
  }
  
  return firstChar.toUpperCase();
};

// Create empty board
const createEmptyBoard = (playerId: string): BingoBoard => {
  const cells: BingoCell[][] = [];
  
  for (let row = 0; row < 5; row++) {
    const cellRow: BingoCell[] = [];
    for (let col = 0; col < 5; col++) {
      cellRow.push({
        id: `${playerId}-${row}-${col}`,
        word: '',
        isMarked: false,
        isValid: true,
        coordinates: [row, col],
      });
    }
    cells.push(cellRow);
  }
  
  return {
    id: `board-${playerId}`,
    playerId,
    cells,
    completedLines: [],
    isComplete: false,
  };
};

// Create mock board with sample data
const createMockBoard = (playerId: string): BingoBoard => {
  const board = createEmptyBoard(playerId);
  
  // Fill with some mock words for demo
  const words = [...mockKoreanWords];
  let wordIndex = 0;
  
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (wordIndex < words.length) {
        board.cells[row][col].word = words[wordIndex];
        board.cells[row][col].isValid = true;
        wordIndex++;
      }
    }
  }
  
  return board;
};

export const createBoardSlice: StateCreator<BoardSlice> = (set, get, api) => ({
  // Initial State
  boards: [],
  currentPlayerBoard: null,
  completedLines: [],
  currentWord: '',
  validationErrors: {},
  lineCountsByPlayerId: {},
  finishOrder: [],
  ranksByPlayerId: {},

  // Actions
  createBoard: (playerId: string) => {
    const { boards } = get();
    
    // Check if board already exists
    const existingBoard = boards.find(b => b.playerId === playerId);
    if (existingBoard) {
      set({ currentPlayerBoard: existingBoard });
      return;
    }
    
    // Create new board
    const newBoard = createEmptyBoard(playerId);
    const updatedBoards = [...boards, newBoard];
    
    set({
      boards: updatedBoards,
      currentPlayerBoard: newBoard,
    });
    
    console.log('✅ Board created for player:', playerId);
  },

  updateCell: (cellId: string, word: string) => {
    const { boards, currentPlayerBoard } = get();
    if (!currentPlayerBoard) return;
    
    const updatedBoard = { ...currentPlayerBoard };
    let cellFound = false;
    
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        if (updatedBoard.cells[row][col].id === cellId) {
          updatedBoard.cells[row][col] = {
            ...updatedBoard.cells[row][col],
            word: word.trim(),
            isValid: word.trim().length > 0, // Basic validation
          };
          cellFound = true;
          break;
        }
      }
      if (cellFound) break;
    }
    
    // Update boards array
    const updatedBoards = boards.map(board => 
      board.id === updatedBoard.id ? updatedBoard : board
    );
    
    set({
      boards: updatedBoards,
      currentPlayerBoard: updatedBoard,
    });
    
    console.log('✅ Cell updated:', cellId, word);
  },

  markCell: (cellId: string, word: string) => {
    const { boards } = get();
    const target = (word || '').trim().toLowerCase();

    // Update all boards' cells for the submitted word
    const updatedBoards = boards.map(board => ({
      ...board,
      cells: board.cells.map(row =>
        row.map(cell =>
          cell.word.trim().toLowerCase() === target
            ? { ...cell, isMarked: true }
            : cell
        )
      ),
    }));

    // Update store boards and ensure currentPlayerBoard stays in sync for this user
    const userId: string | undefined = (get() as any).user?.id;
    const myBoardUpdated = userId ? (updatedBoards.find(b => b.playerId === userId) || null) : null;
    const myLines = myBoardUpdated ? get().detectCompletedLines(myBoardUpdated.id) : [];

    set({
      boards: updatedBoards,
      currentPlayerBoard: myBoardUpdated ?? get().currentPlayerBoard,
      // Update global completedLines for current player's board to drive UI if needed
      completedLines: myLines,
    });

    if (myBoardUpdated) {
      console.log('🟩 Marked word on my board and synced currentPlayerBoard');
    }
  },

  validateBoard: (boardId: string) => {
    const { boards } = get();
    const board = boards.find(b => b.id === boardId);
    if (!board) return false;
    
    const errors: Record<string, string> = {};
    let isValid = true;
    const usedWords = new Set<string>();
    
    // Check each cell
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const cell = board.cells[row][col];
        const word = cell.word.trim().toLowerCase();
        
        // Check if word is empty
        if (!word) {
          errors[cell.id] = '단어를 입력해주세요';
          isValid = false;
          continue;
        }
        
        // Check for duplicates
        if (usedWords.has(word)) {
          errors[cell.id] = '중복된 단어입니다';
          isValid = false;
        } else {
          usedWords.add(word);
        }
        
        // Check if word starts with correct choseong (mock validation)
        const choseong = getChoseong(word);
        if (!choseong) {
          errors[cell.id] = '올바른 한글 단어가 아닙니다';
          isValid = false;
        }
      }
    }
    
    set({ validationErrors: errors });
    return isValid;
  },

  detectCompletedLines: (boardId: string) => {
    const { boards } = get();
    const board = boards.find(b => b.id === boardId);
    if (!board) return [];
    
    const completedLines: BingoLine[] = [];
    
    // Check rows
    for (let row = 0; row < 5; row++) {
      const isRowComplete = board.cells[row].every(cell => cell.isMarked);
      if (isRowComplete) {
        completedLines.push({
          type: 'row',
          index: row,
          cells: board.cells[row].map(cell => cell.coordinates),
        });
      }
    }
    
    // Check columns
    for (let col = 0; col < 5; col++) {
      const isColComplete = board.cells.every(row => row[col].isMarked);
      if (isColComplete) {
        completedLines.push({
          type: 'column',
          index: col,
          cells: board.cells.map(row => row[col].coordinates),
        });
      }
    }
    
    // Check main diagonal (top-left to bottom-right)
    const isMainDiagComplete = board.cells.every((row, idx) => row[idx].isMarked);
    if (isMainDiagComplete) {
      completedLines.push({
        type: 'diagonal',
        index: 0,
        cells: board.cells.map((row, idx) => row[idx].coordinates),
      });
    }
    
    // Check anti-diagonal (top-right to bottom-left)
    const isAntiDiagComplete = board.cells.every((row, idx) => row[4 - idx].isMarked);
    if (isAntiDiagComplete) {
      completedLines.push({
        type: 'diagonal',
        index: 1,
        cells: board.cells.map((row, idx) => row[4 - idx].coordinates),
      });
    }
    
    return completedLines;
  },

  clearValidationErrors: () => {
    set({ validationErrors: {} });
  },

  resetBoard: (playerId: string) => {
    const { boards } = get();
    const newBoard = createEmptyBoard(playerId);
    
    const updatedBoards = boards.map(board =>
      board.playerId === playerId ? newBoard : board
    );
    
    set({
      boards: updatedBoards,
      currentPlayerBoard: newBoard,
      validationErrors: {},
    });
    
    console.log('✅ Board reset for player:', playerId);
  },

  setCurrentWord: (word: string) => {
    set({ currentWord: word });
  },

  getAllBoards: () => {
    return get().boards;
  },

  // Freeze boards for in-game phase from server authoritative payload
  setInGameBoards: (frozenBoards: Record<string, string[][]>) => {
    const boards: BingoBoard[] = Object.entries(frozenBoards).map(([playerId, grid]) => {
      const cells: BingoCell[][] = grid.map((row, rIdx) =>
        row.map((word, cIdx) => ({
          id: `${playerId}-${rIdx}-${cIdx}`,
          word: (word || '').trim(),
          isMarked: false,
          isValid: true,
          coordinates: [rIdx, cIdx],
        }))
      );
      return {
        id: `board-${playerId}`,
        playerId,
        cells,
        completedLines: [],
        isComplete: false,
      };
    });

    // Attempt to set current player's board
    const userId = (get() as any).user?.id;
    const myBoard = userId ? boards.find(b => b.playerId === userId) || null : null;

    set({ boards, currentPlayerBoard: myBoard });
  },

  setLineCountsByPlayerId: (counts: Record<string, number>) => {
    set({ lineCountsByPlayerId: counts });
  },

  setRanking: (finishOrder: string[], ranks: Record<string, number>) => {
    set({ finishOrder, ranksByPlayerId: ranks });
  },

  resetRanking: () => {
    set({ finishOrder: [], ranksByPlayerId: {} });
  },
});
