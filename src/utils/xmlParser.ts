/**
 * XML parsing utilities for Korean Dictionary API
 * Uses regex-based parsing compatible with React Native
 */

/**
 * Interface for parsed XML response from Korean dictionary
 */
export interface DictionaryXMLResponse {
  total: number;
  items?: Array<{
    word: string;
    pos?: string;
    definition?: string;
  }>;
  error?: string;
}

/**
 * Parse XML response from Korean Dictionary API
 * Uses regex-based parsing compatible with React Native
 */
export function parseKoreanDictionaryXML(xmlText: string): DictionaryXMLResponse {
  try {
    // Extract total count using regex (main indicator of word existence)
    const totalMatch = xmlText.match(/<total>(\d+)<\/total>/);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

    // If no results, return early
    if (total === 0) {
      return { total: 0 };
    }

    // Extract word items if they exist
    const items: Array<{ word: string, pos?: string, definition?: string }> = [];

    // Match all <item> blocks
    const itemRegex = /<item[\s\S]*?<\/item>/g;
    const itemMatches = xmlText.match(itemRegex);

    if (itemMatches) {
      for (const itemXml of itemMatches) {
        // Extract word, pos, and definition from each item
        const wordMatch = itemXml.match(/<word>([^<]*)<\/word>/);
        const posMatch = itemXml.match(/<pos>([^<]*)<\/pos>/);
        const defMatch = itemXml.match(/<definition>([^<]*)<\/definition>/);

        if (wordMatch) {
          items.push({
            word: wordMatch[1] || '',
            pos: posMatch ? posMatch[1] : undefined,
            definition: defMatch ? defMatch[1] : undefined
          });
        }
      }
    }

    return {
      total,
      items: items.length > 0 ? items : undefined
    };

  } catch (error) {
    console.error('XML parsing error:', error);
    return {
      total: 0,
      error: 'Failed to parse XML response'
    };
  }
}
