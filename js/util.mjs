export function arraySum(arr) {
  return arr.reduce((acc, n) => acc + n, 0);
}

export function between(val, min, max) {
  return val >= min && val <= max;
}

export function bitCount(n) {
    let count = 0;
    while (n > 0) {
        n &= (n - 1);
        count++;
    }
    return count;
}

// lsb = 1
export function bitSum(n) {
  let i = 1;
  let sum = 0;
  while (n) {
    if (n & 1) {
      sum += i;
    }
    n >>>= 1;
    i++;
  }
  return sum;
}

export function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}
