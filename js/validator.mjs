import { arraySum } from './util.mjs';

export default class Validator {
  constructor(data) {
    this.digits = data.digits;
    this.cages = data.cages;
    this.sums = data.sums;
  }

  validate() {
    return this.checkRows()
      || this.checkColumns()
      || this.checkNonets()
      || this.checkCages()
      || this.checkDigits();
  }

  checkDigits() {
    let anyEmpty = false;
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const digit = this.digits[y][x];
        if (digit < 0 || digit > 9) {
          return {
            cells: [[x, y]],
            message: 'Invalid digit'
          }
        }
        if (digit === 0) {
          anyEmpty = true;
        }
      }
    }
    if (!anyEmpty) {
      return {
        message: 'Nothing to do'
      }
    }
    return false;
  }

  checkRows() {
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9 - 1; x++) {
        if (this.digits[y][x] <= 0) {
          continue;
        }
        const duplicates = [[x, y]];
        for (let i = x + 1; i < 9; i++) {
          if (this.digits[y][x] === this.digits[y][i]) {
            duplicates.push([i, y]);
          }
        }
        if (duplicates.length > 1) {
          return {
            cells: duplicates,
            message: 'Row duplicate'
          }
        }
      }
    }
    return false;
  }

  checkColumns() {
    for (let y = 0; y < 9 - 1; y++) {
      for (let x = 0; x < 9; x++) {
        if (this.digits[y][x] <= 0) {
          continue;
        }
        const duplicates = [[x, y]];
        for (let i = y + 1; i < 9; i++) {
          if (this.digits[y][x] === this.digits[i][x]) {
            duplicates.push([x, i]);
          }
        }
        if (duplicates.length > 1) {
          return {
            cells: duplicates,
            message: 'Column duplicate'
          }
        }
      }
    }
    return false;
  }

  checkNonets() {
    for (let i = 0; i < 9; i += 3) {
      for (let j = 0; j < 9; j += 3) {
        const seen = Object.fromEntries(
          Array.from({length: 9}, (_, i) => [i + 1, []])
        );
        for (let x = i; x < i + 3; x++) {
          for (let y = j; y < j + 3; y++) {
            if (this.digits[y][x] <= 0) {
              continue;
            }
            seen[this.digits[y][x]].push([x, y]);
          }
        }
        const duplicates = Object.values(seen).find(dup => dup.length > 1);
        if (duplicates !== undefined) {
          return {
            cells: duplicates,
            message: 'Nonet duplicate'
          }
        }
      }
    }
    return false;
  }

  getCageCells(cage) {
    const cageCells = [];
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (this.cages[y][x] === cage) {
          cageCells.push([x, y]);
        }
      }
    }
    return cageCells;
  }

  getCageDigits(cage) {
    return this.getCageCells(cage).map(([x, y]) => this.digits[y][x]);
  }

  getTotalSum() {
    return arraySum(this.sums);
  }

  checkCagesSumPossible() {
    for (const cage of this.sums.keys()) {
      if (this.sums[cage] <= 0) {
        return {
          cages: [cage],
          message: 'Cage without sum'
        }
      }
      const cageDigits = this.getCageDigits(cage);
      if (cageDigits.length > 9) {
        return {
          cages: [cage],
          message: 'Cage max 9 cells'
        }
      }
      const filledDigits = cageDigits.filter(d => d > 0);
      const nineDigits = new Set(Array.from({length: 9}, (_, i) => i + 1));
      const remainingDigits = [...nineDigits.difference(new Set(filledDigits))].sort();
      const numbersOfCellsToFill = cageDigits.length - filledDigits.length;
      const filledDigitsSum = arraySum(filledDigits);
      let maxSum = filledDigitsSum
        + arraySum(remainingDigits.slice(remainingDigits.length - numbersOfCellsToFill));
      if (maxSum < this.sums[cage]) {
        return {
          cages: [cage],
          message: 'Sum too big'
        }
      }
      let minSum = filledDigitsSum
        + arraySum(remainingDigits.reverse().slice(remainingDigits.length - numbersOfCellsToFill));
      if (minSum > this.sums[cage]) {
        return {
          cages: [cage],
          message: 'Sum too small'
        }
      }
    }
    if (this.getTotalSum() !== 405) {
      return {
        message: 'Total sum not 405'
      }
    }
    return false;
  }

  checkCagesDuplicates() {
    for (const cage of this.sums.keys()) {
      const filledCageCells =
        this.getCageCells(cage).filter(([x, y]) => this.digits[y][x] > 0);
      for (let i = 0; i < filledCageCells.length - 1; i++) {
        const [x, y] = filledCageCells[i];
        const duplicates = [[x, y]];
        for (let j = i + 1; j < filledCageCells.length; j++) {
          const [nx, ny] = filledCageCells[j];
          if (this.digits[y][x] === this.digits[ny][nx]) {
            duplicates.push([nx, ny]);
          }
        }
        if (duplicates.length > 1) {
          return {
            cells: duplicates,
            message: "Cage duplicate"
          }
        }
      }
    }
    return false;
  }

  checkAllCellsInCages() {
    const cellsNotInCage = [];
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (this.cages[y][x] < 0) {
          cellsNotInCage.push([x, y]);
        }
      }
    }
    if (cellsNotInCage.length) {
      return {
        cells: cellsNotInCage,
        message: 'Not in cage'
      }
    }
    return false;
  }

  checkCellsConnected(cells) {
    const cmp = (c1) => (c2) => c1[0] === c2[0] && c1[1] === c2[1];
    const queue = [cells[0]];
    const visited = [cells[0]];
    while (queue.length) {
      const [x, y] = queue.shift();
      const neighbours = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const neighbour of neighbours) {
        if (cells.some(cmp(neighbour)) && !visited.some(cmp(neighbour)))  {
          queue.push(neighbour);
          visited.push(neighbour);
        }
      }
    }
    return visited.length === cells.length;
  }

  checkCagesConnected() {
    for (const cage of this.sums.keys()) {
      if (!this.checkCellsConnected(this.getCageCells(cage))) {
        return {
          cages: [cage],
          message: 'Cage not connected'
        }
      }
    }
    return false;
  }

  checkCages() {
    const allCellsInCages = this.checkAllCellsInCages();
    if (allCellsInCages !== false) {
      return allCellsInCages;
    }

    const cageDuplicates = this.checkCagesDuplicates();
    if (cageDuplicates !== false) {
      return cageDuplicates;
    }

    const cagesSumPossible = this.checkCagesSumPossible();
    if (cagesSumPossible !== false) {
      return cagesSumPossible;
    }

    const cagesConnected = this.checkCagesConnected();
    if (cagesConnected !== false) {
      return cagesConnected;
    }

    return false;
  }
}
