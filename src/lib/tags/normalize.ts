/**
 * Tag normalization utilities for AI-generated tag processing
 */

/**
 * Convert a tag name to a normalized slug
 * Handles Japanese text, removes special characters, and normalizes spacing
 */
export const toSlug = (s: string): string => {
  return s
    .normalize("NFKC") // Unicode normalization for Japanese text
    .trim()
    .toLowerCase()
    .replace(/[#"'""'、。,\.\(\)\[\]{}!?\s]+/g, " ") // Replace punctuation and spaces
    .replace(/\s+/g, " ") // Normalize multiple spaces
    .trim();
};

/**
 * Normalize an array of tags by removing duplicates based on slug comparison
 * Preserves the original label format while preventing duplicates
 */
export const normalizeTags = (arr: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  
  for (const raw of arr) {
    const label = raw.trim();
    const slug = toSlug(label);
    
    // Skip empty tags or duplicates
    if (!slug || seen.has(slug)) continue;
    
    seen.add(slug);
    out.push(label);
  }
  
  return out;
};