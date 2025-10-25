/**
 * Korean Dictionary Service
 *
 * Provides validation for Korean words using:
 * 1. Consonant matching validation
 * 2. Official Korean dictionary API validation
 */
import * as Hangul from 'hangul-js';
import { KOREAN_DICT_CONFIG } from '../constants/config';
import { parseKoreanDictionaryXML, DictionaryXMLResponse } from '../utils/xmlParser';

// API Configuration
const KOREAN_DICT_API_BASE = KOREAN_DICT_CONFIG.API_BASE_URL;

// Real API key for Korean dictionary
const API_KEY = KOREAN_DICT_CONFIG.API_KEY;

// Development mode flag - now false since we have a real API key
const DEVELOPMENT_MODE = KOREAN_DICT_CONFIG.DEVELOPMENT_MODE;

/**
 * Interface for word validation result
 */
export interface WordValidationResult {
  isValid: boolean;
  matchesConsonant: boolean;
  existsInDictionary: boolean;
  error?: string;
  definition?: string;
}

/**
 * Korean Dictionary Service Class
 */
export class KoreanDictionaryService {

  /**
   * Decomposes a Korean syllable to get initial consonant (초성) using hangul-js
   * @param syllable Korean syllable character
   * @returns Initial consonant or null if not Korean
   */
  private getInitialConsonant(syllable: string): string | null {
    try {
      // Use hangul-js to disassemble the syllable
      const disassembled = Hangul.disassemble(syllable);

      // Return the first character if it's a consonant (초성)
      if (disassembled.length > 0 && Hangul.isConsonant(disassembled[0])) {
        return disassembled[0];
      }

      return null;
    } catch (error) {
      console.warn(`Failed to extract consonant from syllable: ${syllable}`, error);
      return null;
    }
  }

  /**
   * Checks if a word matches the given consonant combination using hangul-js
   * @param word Korean word to check
   * @param consonantOrPair Single consonant like 'ㄱ' or a pair like 'ㄱㅅ'
   * @returns true if word matches the consonant rule
   */
  public matchesConsonantPattern(word: string, consonantOrPair: string): boolean {
    if (!word || word.trim().length === 0) return false;

    try {
      // Normalize inputs
      const normalizedWord = word.trim();
      const normalized = (consonantOrPair || '').replace(/\s+/g, '');
      if (normalized.length === 0) return false;

      // Helper: get the first syllable's initial consonant (초성) from the word
      const grouped = Hangul.disassemble(normalizedWord, true) as string[][];
      const firstSyllable = Array.isArray(grouped) && grouped.length > 0 ? grouped[0] : null;
      const firstInitial = firstSyllable && firstSyllable.length > 0 && Hangul.isConsonant(firstSyllable[0])
        ? firstSyllable[0]
        : null;

      // Normalize double initial consonants to their base forms for matching
      const baseMap: Record<string, string> = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
      const normalizedFirst = firstInitial ? (baseMap[firstInitial] || firstInitial) : null;

      if (!normalizedFirst) return false; // Not a valid Korean syllable start

      // Single consonant: must START with the selected consonant
      if (normalized.length === 1) {
        const target = baseMap[normalized] || normalized;
        return normalizedFirst === target;
      }

      // Pair: must START with one of the two consonants
      const targets = normalized.split('').filter((c) => Hangul.isConsonant(c));
      if (targets.length < 1) return false;
      const normalizedTargets = targets.map((c) => baseMap[c] || c);
      return normalizedTargets.includes(normalizedFirst);

    } catch (error) {
      console.warn(`Failed to match consonant pattern for word: ${word}`, error);
      return false;
    }
  }

  /**
   * Validates word existence using Korean Dictionary API
   * @param word Korean word to validate
   * @returns Promise<{ exists: boolean, definition?: string, error?: string }> 
   */
  public async validateWordInDictionary(word: string): Promise<{ exists: boolean, definition?: string, error?: string }> {
    try {
      // In development mode, use mock validation
      if (DEVELOPMENT_MODE) {
        return this.mockDictionaryValidation(word);
      }

      // Use Korean dictionary API
      const result = await this.queryKoreanDictionary(word);
      return result;

    } catch (error) {
      console.error('Dictionary API error:', error);

      // Fallback to mock validation in case of API errors
      if (DEVELOPMENT_MODE) {
        console.log('🔄 Falling back to mock validation due to API error');
        return this.mockDictionaryValidation(word);
      }

      return {
        exists: false,
        error: 'Dictionary service unavailable'
      };
    }
  }

  /**
   * Mock dictionary validation for development mode
   * Simulates API behavior with common Korean words
   */
  private mockDictionaryValidation(word: string): { exists: boolean, definition?: string, error?: string } {
    // List of common Korean words for mock validation
    const commonWords = [
      '가게', '가족', '감사', '강아지', '개구리', '거울', '게임', '겨울', '고양이', '공부',
      '나무', '날씨', '냉장고', '노래', '누나', '눈물', '다리', '대학교', '도서관', '동생',
      '라디오', '마음', '만화', '머리', '모래', '물고기', '미래', '바다', '밥상', '별빛',
      '사과', '새벽', '소나무', '시간', '아침', '엄마', '여름', '오늘', '우리', '음악',
      '자동차', '전화', '집안', '책상', '친구', '컴퓨터', '타자기', '학교', '하늘', '할머니'
    ];

    const isCommonWord = commonWords.includes(word);

    return {
      exists: isCommonWord,
      definition: isCommonWord ? `Mock definition for '${word}'` : undefined,
      error: isCommonWord ? undefined : undefined // Let consonant validation handle the error
    };
  }

  /**
   * Query Korean Dictionary API using the working endpoint
   */
  private async queryKoreanDictionary(word: string): Promise<{ exists: boolean, definition?: string, error?: string }> {
    const params = new URLSearchParams({
      key: API_KEY,
      type_search: 'search',
      part: 'word',
      q: word,
      sort: 'dict',
    });

    const response = await fetch(`${KOREAN_DICT_API_BASE}?${params}`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    // Get XML response text
    const xmlText = await response.text();

    // Debug: Log the API response
    console.log('🔍 Korean Dictionary API Response:');
    console.log('📄 Request URL:', `${KOREAN_DICT_API_BASE}?${params}`);
    console.log('📊 Response Length:', xmlText.length, 'characters');

    try {
      // Parse XML response
      const parsedData = this.parseXMLResponse(xmlText);

      // Debug: Log parsed data
      console.log('✅ Parsed Data:', parsedData);

      if (parsedData.error) {
        return {
          exists: false,
          error: `API Error: ${parsedData.error}`
        };
      }

      // Check if word exists based on total count
      const wordExists = parsedData.total > 0;

      if (wordExists && parsedData.items && parsedData.items.length > 0) {
        const firstResult = parsedData.items[0];
        return {
          exists: true,
          definition: firstResult.definition || `${firstResult.pos || 'Korean'} word: ${firstResult.word}`
        };
      }

      return {
        exists: wordExists,
        definition: wordExists ? `Korean word: ${word}` : undefined
      };

    } catch (parseError) {
      console.error('Failed to parse XML response:', parseError);
      throw new Error('Invalid XML response from API');
    }
  }

  /**
   * Parse XML response from Korean Dictionary API
   * Uses regex-based parsing compatible with React Native
   */
  private parseXMLResponse(xmlText: string): DictionaryXMLResponse {
    return parseKoreanDictionaryXML(xmlText);
  }



  /**
   * Comprehensive word validation combining consonant and dictionary checks
   * @param word Korean word to validate
   * @param consonantPair Required consonant pair (e.g., 'ㄱㅅ')
   * @returns Promise<WordValidationResult> Complete validation result
   */
  public async validateWord(word: string, consonantPair: string): Promise<WordValidationResult> {
    const result: WordValidationResult = {
      isValid: false,
      matchesConsonant: false,
      existsInDictionary: false
    };

    // Step 1: Check consonant pattern matching
    result.matchesConsonant = this.matchesConsonantPattern(word, consonantPair);

    if (!result.matchesConsonant) {
      return {
        ...result,
        error: consonantPair && consonantPair.trim().length === 1
          ? `Word must start with '${consonantPair}'`
          : `Word must start with one of '${consonantPair}'`
      };
    }

    // Step 2: Check dictionary existence
    const dictionaryResult = await this.validateWordInDictionary(word);
    result.existsInDictionary = dictionaryResult.exists;
    result.definition = dictionaryResult.definition;
    result.error = dictionaryResult.error;

    // Final validation
    result.isValid = result.matchesConsonant && result.existsInDictionary;

    return result;
  }
}

// Export singleton instance
export const koreanDictionaryService = new KoreanDictionaryService();
