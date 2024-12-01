import { arraySum, bitCount, bitSum } from './util.mjs';

export default class Solver {
  static #NONET_CELLS;
  static #SUMS_REMAINING_DIGITS;
  static #BIT_COUNTS;
  
  static {
    // compile nonet cells
    this.#NONET_CELLS = Array.from({length: 9}, () => new Uint16Array(9));
    let idx = 0;
    for (let y = 0; y < 9; y += 3) {
      for (let x = 0; x < 9; x += 3) {
        for (let sy = y; sy < y + 3; sy++) {
          for (let sx = x; sx < x + 3; sx++) {
            this.#NONET_CELLS[sy][sx] = idx;
          }
        }
        idx++;
      }
    }


    const bitSums = new Uint8Array(512);
    this.#BIT_COUNTS = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      bitSums[i] = bitSum(i);
      this.#BIT_COUNTS[i] = bitCount(i);
    }


    // calculate all possible digits for all cage combinations
    const getPossibleSumDigits = (cellNum, sum, usedDigits, start = 0b1) => {
      if (cellNum === this.#BIT_COUNTS[usedDigits]) {
        return sum === bitSums[usedDigits] ? usedDigits : 0;
      }

      let possibleDigits = 0;
      for (let b = start; b <= (1 << 8); b <<= 1) {
        if (usedDigits & b) {
          continue;
        }
        possibleDigits |= getPossibleSumDigits(cellNum, sum, usedDigits | b, b << 1);
      }
      return possibleDigits;
    }

    const getRemainingSumDigits = (cellNum, sum) => {
      const digits = Array(512);
      for (let bits = 0; bits < digits.length; bits++) {
        if (bitSums[bits] >= sum) {
          digits[bits] = 0;
          continue;
        }
        const possibleDigits = getPossibleSumDigits(cellNum, sum, bits);
        digits[bits] = (possibleDigits & ~bits);
      }
      return new Uint16Array(
        digits.slice(0, digits.findLastIndex(s => s !== 0) + 1)
      );
    }

    const compileRemainingSumsDigitsForCellNumber = (cellNum) => {
      const nineDigits = Array.from({length: 9}, (_, i) => i + 1);
      const minSum = arraySum(nineDigits.slice(0, cellNum));
      const maxSum = arraySum(nineDigits.slice(-cellNum));
      const sums = Array(maxSum);
      for (let i = minSum; i <= maxSum; i++) {
        sums[i] = getRemainingSumDigits(cellNum, i);
      }
      return sums;
    }

    // no cages with 0 cells
    this.#SUMS_REMAINING_DIGITS = Array(9);
    for (let i = 0; i < this.#SUMS_REMAINING_DIGITS.length; i++) {
      this.#SUMS_REMAINING_DIGITS[i] = compileRemainingSumsDigitsForCellNumber(i + 1);
    }
  }

  static getCachedRemainingSumDigits(cellNum, sum, digits) {
    return Solver.#SUMS_REMAINING_DIGITS[cellNum - 1][sum][~digits & 0b111111111];
  }

  constructor(digits, cages, sums) {
    // benchmark on chromium shows typed array
    // makes sense only for some things, weird
    this.digits = digits.map(row => row.slice());
    this.cages = cages;
    this.sums = new Uint8Array(sums);
  }

  setup() {
    this.bigits = Array.from({length: 9}, () => new Uint16Array(9));
    const NineDigits = 0b111111111;
    this.rowHash = new Uint16Array(9).fill(NineDigits);
    this.columnHash = new Uint16Array(9).fill(NineDigits);
    this.nonetHash = new Uint16Array(9).fill(NineDigits);
    this.cageDigitsHash = new Uint16Array(this.sums.length).fill(NineDigits);
    this.cageSizes = new Uint8Array(this.sums.length);
    this.numberOfCellsToFill = 0;
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const bigit = ((1 << this.digits[y][x]) >>> 1);
        this.bigits[y][x] = bigit;
        const nBigit = ~bigit;
        this.rowHash[y] &= nBigit;
        this.columnHash[x] &= nBigit;
        this.nonetHash[Solver.#NONET_CELLS[y][x]] &= nBigit;
        const cage = this.cages[y][x];
        this.cageDigitsHash[cage] &= nBigit;
        this.cageSizes[cage]++;
        this.numberOfCellsToFill += (bigit === 0);
      }
    }
  }

  toDigits() {
    const digits = Array.from({length: 9}, () => Array(9));
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        digits[y][x] = Math.log2(this.bigits[y][x]) + 1;
      }
    }
    return digits;
  }

  nextLegalDigit(legalDigits, bigit) {
    const greaterDigits = legalDigits & ~(bigit - 1);
    return greaterDigits & -greaterDigits;
  }

  getLegalDigits(x, y) {
    const cage = this.cages[y][x];
    const cageDigits = this.cageDigitsHash[cage];
    const cageCellsNumber = this.cageSizes[cage];
    const cageSum = this.sums[cage];
    const remainingCageDigits = Solver.getCachedRemainingSumDigits(cageCellsNumber, cageSum, cageDigits);
    const legalDigits =
      this.rowHash[y]
      & this.columnHash[x]
      & this.nonetHash[Solver.#NONET_CELLS[y][x]]
      & remainingCageDigits;
    return legalDigits;
  }

  findMRV() {
    let mrvX = -1;
    let mrvY = -1;
    let mrvLegalDigits = 0;
    let mrvBitCount = 42;
    let mrvDegree = 0;
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (this.bigits[y][x] !== 0) {
          continue;
        }
        const legalDigits = this.getLegalDigits(x, y);
        const bitCount = Solver.#BIT_COUNTS[legalDigits];
        if (bitCount === 0) {
          return [0, -1, -1];
        }
        // benchmark shows this is beneficial
        if (bitCount === 1) {
          return [legalDigits, x, y];
        }
        if (bitCount > mrvBitCount) {
          continue;
        }
        const degree =
          Solver.#BIT_COUNTS[this.rowHash[y]]
          + Solver.#BIT_COUNTS[this.columnHash[x]]
          + Solver.#BIT_COUNTS[this.nonetHash[Solver.#NONET_CELLS[y][x]]]
          + Solver.#BIT_COUNTS[this.cageDigitsHash[this.cages[y][x]]];
        // Surprisingly, prioritizing lower degree here is faster than
        // no degree heuristic at all, and much, much faster than
        // prioritizing higher degree. Weird.
        if (bitCount === mrvBitCount && degree >= mrvDegree) {
          continue;
        }
        mrvX = x;
        mrvY = y;
        mrvLegalDigits = legalDigits;
        mrvBitCount = bitCount;
        mrvDegree = degree;
      }
    }
    return [mrvLegalDigits, mrvX, mrvY];
  }

  insertWithHash(bigit, x, y) {
    this.bigits[y][x] = bigit;
    const nBigit = ~bigit;
    this.rowHash[y] &= nBigit;
    this.columnHash[x] &= nBigit;
    this.nonetHash[Solver.#NONET_CELLS[y][x]] &= nBigit;
    this.cageDigitsHash[this.cages[y][x]] &= nBigit;
  }

  clearHash(x, y) {
    const bigit = this.bigits[y][x];
    this.bigits[y][x] = 0;
    this.rowHash[y] |= bigit;
    this.columnHash[x] |= bigit;
    this.nonetHash[Solver.#NONET_CELLS[y][x]] |= bigit;
    this.cageDigitsHash[this.cages[y][x]] |= bigit;
    return bigit;
  }

  solve() {
    this.setup();
    let [legalDigits, x, y] = this.findMRV();
    const NoSolution = {
      message: 'No solution'
    };
    if (legalDigits === 0) {
      return NoSolution;
    }
    let bigit = 0b1;
    let solution = null;
    const cellStack = [];
    while (true) {
      bigit = this.nextLegalDigit(legalDigits, bigit);
      if (bigit === 0) {
        if (cellStack.length === 0) {
          break;
        }
        [legalDigits, x, y] = cellStack.pop();
        bigit = (this.clearHash(x, y) << 1);
      } else {
        this.insertWithHash(bigit, x, y);
        cellStack.push([legalDigits, x, y]);
        [legalDigits, x, y] = this.findMRV();
        bigit = 0b1;
        if (cellStack.length === this.numberOfCellsToFill) {
          if (solution !== null) {
            return {
              message: 'Multiple solutions'
            };
          }
          solution = this.toDigits();
        }
      }
    }
    return solution === null ? NoSolution : solution;
  }
}
