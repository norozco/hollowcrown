/**
 * Resolve NPC portrait PNG paths to URLs usable in an <img src=...>.
 *
 * Vite's `import.meta.glob` statically indexes every PNG under
 * `src/assets/portraits/` at build time, giving us a path → URL map.
 * The NPC records in `npcs.json` store their portrait paths relative
 * to `src/assets/` (e.g. `"portraits/brenna/neutral.png"`), so we
 * prepend `/src/assets/` to match the glob key format.
 *
 * Returns null if the file doesn't exist in the bundle — callers
 * should fall back to the placeholder portrait in that case.
 */

// Eager-import every portrait so we can do synchronous lookups.
// `?url` gives us the hashed URL; `import: 'default'` keeps the map
// values as strings rather than module objects.
const PORTRAIT_URLS = import.meta.glob('/src/assets/portraits/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/**
 * Resolve a portraits-relative path (e.g. "portraits/brenna/neutral.png")
 * to its bundled URL, or return null if not found.
 */
export function resolvePortraitUrl(relativePath: string | undefined): string | null {
  if (!relativePath) return null;
  const key = `/src/assets/${relativePath}`;
  return PORTRAIT_URLS[key] ?? null;
}

/**
 * Pick the best available portrait URL for an NPC at a given
 * expression. Fallback chain:
 *   1. exact expression match (e.g. "thoughtful")
 *   2. "neutral"
 *   3. null → caller renders placeholder circle
 */
export function pickPortraitUrl(
  portraits: Record<string, string> | undefined,
  expression: string | undefined,
): string | null {
  if (!portraits) return null;
  const candidates = [
    expression ? portraits[expression] : undefined,
    portraits.neutral,
  ].filter((v): v is string => typeof v === 'string');
  for (const path of candidates) {
    const url = resolvePortraitUrl(path);
    if (url) return url;
  }
  return null;
}
