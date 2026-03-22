/**
 * Compute Pearson correlation coefficient between two arrays.
 * Returns NaN if arrays have < 3 elements or zero variance.
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return NaN;

  const meanX = x.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanY = y.slice(0, n).reduce((s, v) => s + v, 0) / n;

  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denom = Math.sqrt(sumX2 * sumY2);
  return denom === 0 ? NaN : sumXY / denom;
}

/**
 * Check statistical significance (simplified: |r| > 2/sqrt(n)).
 */
export function isSignificant(r: number, n: number): boolean {
  if (isNaN(r) || n < 3) return false;
  return Math.abs(r) > 2 / Math.sqrt(n);
}

/**
 * Interpret a correlation coefficient.
 */
export function interpretCorrelation(r: number): string {
  const abs = Math.abs(r);
  const dir = r > 0 ? "positive" : "negative";
  if (abs >= 0.7) return `Strong ${dir} correlation`;
  if (abs >= 0.4) return `Moderate ${dir} correlation`;
  if (abs >= 0.2) return `Weak ${dir} correlation`;
  return "No meaningful correlation";
}
