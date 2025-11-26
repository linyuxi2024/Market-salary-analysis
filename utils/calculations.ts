import { SalaryStats } from '../types';

/**
 * Calculates the percentile value based on the linear interpolation formula provided:
 * Position L = (Percentile / 100) * (n + 1)
 *
 * @param sortedData Array of numbers sorted in ascending order
 * @param percentile Integer (e.g., 25, 50, 75)
 */
const calculatePercentile = (sortedData: number[], percentile: number): number => {
  const n = sortedData.length;
  if (n === 0) return 0;
  if (n === 1) return sortedData[0];

  // Formula from user image: L = (P/100) * (n + 1)
  const L = (percentile / 100) * (n + 1);

  // We need to map 1-based index L to 0-based array index
  // The user example: L=1.75 means between 1st (index 0) and 2nd (index 1) item.
  // Integer part of L (1-based index)
  const k = Math.floor(L);
  // Fractional part
  const d = L - k;

  // Convert to 0-based index
  const idx = k - 1;

  if (idx < 0) {
    // L was < 1, extrapolation or cap at min
    return sortedData[0]; 
  }
  if (idx >= n - 1) {
    // L was > n, cap at max
    return sortedData[n - 1];
  }

  // Linear Interpolation: Value = Arr[i] + (Arr[i+1] - Arr[i]) * d
  const v_i = sortedData[idx];
  const v_next = sortedData[idx + 1];

  return v_i + (v_next - v_i) * d;
};

export const computeSalaryStats = (salaries: number[]): SalaryStats => {
  // Sort ascending (required by method)
  const sorted = [...salaries].sort((a, b) => a - b);
  const n = sorted.length;

  if (n === 0) {
    return { min: 0, p25: 0, p50: 0, p75: 0, max: 0, sampleSize: 0 };
  }

  return {
    min: sorted[0],
    p25: calculatePercentile(sorted, 25),
    p50: calculatePercentile(sorted, 50),
    p75: calculatePercentile(sorted, 75),
    max: sorted[n - 1],
    sampleSize: n
  };
};
