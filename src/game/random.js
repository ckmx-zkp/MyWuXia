export function nextRandom(seed) {
  let x = (seed >>> 0) || 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return { seed: x >>> 0, value: (x >>> 0) / 4294967296 };
}
