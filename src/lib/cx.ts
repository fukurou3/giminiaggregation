/**
 * Simple className utility for concatenating class strings.
 * Filters out falsy values and joins valid classes with spaces.
 * 
 * @param classes - Array of class strings (can include falsy values)
 * @returns Concatenated className string
 */
export function cx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}