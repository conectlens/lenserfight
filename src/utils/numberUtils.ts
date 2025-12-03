export const formatCount = (num: number): string => {
  if (num === 0) return '0';
  if (num < 1000) return num.toString();
  if (num < 1000000) {
    // 1500 -> 1.5K
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
};