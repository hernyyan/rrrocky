/**
 * Fuzzy tab-name matching for saved tab config auto-restore.
 *
 * When a company uploads a new workbook, sheet names may differ slightly from
 * the previous upload (e.g. "Income Statement" vs "Inc. Statement"). fuzzyMatchTab
 * finds the closest match above a 60% normalized similarity threshold.
 */

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Find the closest match for savedTab in availableTabs.
 * Returns null if no match scores >= 60% similarity.
 */
export function fuzzyMatchTab(savedTab: string, availableTabs: string[]): string | null {
  const normSaved = normalize(savedTab)
  if (!normSaved || availableTabs.length === 0) return null

  let best: string | null = null
  let bestScore = 0

  for (const tab of availableTabs) {
    const normTab = normalize(tab)
    const maxLen = Math.max(normSaved.length, normTab.length)
    if (maxLen === 0) continue
    const score = 1 - levenshtein(normSaved, normTab) / maxLen
    if (score > bestScore) {
      bestScore = score
      best = tab
    }
  }

  return bestScore >= 0.6 ? best : null
}
