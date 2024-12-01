import { clamp } from './util.mjs';

export default class Board {
  currentCage = 0;
  maxCage = 0;

  #selectedCell;

  constructor(element) {
    this.element = element;
    for (let i = 0; i < 9; i++) {
      const row = document.createElement('tr');
      for (let j = 0; j < 9; j++) {
        const cell = document.createElement('td');
        cell.dataset.y = i;
        cell.dataset.x = j;
        const classes = [
          'digit',
          'sum',
          'center',
          'top-right',
          'bottom-right',
          'bottom-left',
          'top-left'
        ];
        for (const clazz of classes) {
          const div = document.createElement('div');
          div.className = clazz;
          cell.append(div);
        }
        row.append(cell);
      }
      element.append(row);
    }
    this.selectedCell = element.firstChild.firstChild;
  }

  highlight(cells, cages) {
    const hlCells = [];
    if (cells) {
      for (const [x, y] of cells) {
        const cellEl = this.getCellAt(x, y);
        hlCells.push(cellEl);
      }
    }
    if (cages) {
      for (const cage of cages) {
        const cageCells = this.element.querySelectorAll(`[data-cage="${cage}"]`);
        hlCells.push(...cageCells);
      }
    }
    if (hlCells.length) {
      for (const cells of hlCells) {
        cells.classList.add('highlight');
      }
      document.addEventListener(
        'keydown',
        event => {
          //event.stopImmediatePropagation();
          hlCells.forEach(c => c.classList.remove('highlight'))
        },
        {
          capture: true,
          once: true
        }
      );
    }
  }

  getAllCages() {
    const allCells = [...this.element.getElementsByTagName('td')];
    const allCages = [...
      new Set(
        allCells.map(c => c.dataset.cage)
          .filter(g => g != null)
          .map(g => Number(g))
      )
    ].sort((a, b) => a - b);
    return allCages;
  }

  normalizeCages() {
    const allCages = this.getAllCages();
    this.currentCage = Math.max(0, allCages.indexOf(this.currentCage));
    this.maxCage = allCages.length;
    for (const [idx, cage] of allCages.entries()) {
      if (idx === cage) {
        continue;
      }
      this.getCageCells(cage).forEach(c => c.dataset.cage = idx);
    }
  }

  export() {
    this.normalizeCages();
    const digits = Array(9);
    const cages = Array(9);
    for (let y = 0; y < 9; y++) {
      const digitRow = Array(9);
      const cageRow = Array(9);
      for (let x = 0; x < 9; x++) {
        const cell = this.getCellAt(x, y);
        const digit = Number(this.getCellElement(cell, 'digit').innerText || 0);
        const cage = Number(cell.dataset.cage || -1);
        digitRow[x] = digit;
        cageRow[x] = cage;
      }
      digits[y] = digitRow;
      cages[y] = cageRow;
    }
    const allCages = this.getAllCages();
    const sums = Array(allCages.length);
    for (const cage of allCages) {
      // if no [data-sum] set, Number('') is 0 anyway
      const sumCell = this.element.querySelector(`[data-cage="${cage}"]`);
      const sum = Number(this.getCellElement(sumCell, 'sum').innerText);
      sums[cage] = sum;
    }
    const serializedBoard = { digits, cages, sums };
    return serializedBoard;
  }

  clear() {
    const cells = this.element.getElementsByTagName('td');
    for (const cell of cells) {
      this.getCellElement(cell, 'digit').innerText = '';
      this.getCellElement(cell, 'sum').innerText = '';
      delete cell.dataset.cage;
      cell.className = '';
    }
    this.selectedCell = this.selectedCell;
  }

  import(digits, cages, sums) {
    this.clear();
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const cell = this.getCellAt(x, y);
        const digit = digits[y][x];
        if (digit >= 1 && digit <= 9) {
          this.getCellElement(cell, 'digit').innerText = digit;
        }
        const cage = cages[y][x];
        if (cage >= 0) {
          cell.dataset.cage = cage;
        }
      }
    }
    for (const cage of sums.keys()) {
      const sum = sums[cage];
      if (sum <= 0) {
        continue;
      }
      const sumCell = this.element.querySelector(`[data-cage="${cage}"]`);
      this.getCellElement(sumCell, 'sum').innerText = sum;
    }
    const cells = this.element.getElementsByTagName('td');
    for (const cell of cells) {
      Object.keys(this.getCageNieghbours(cell))
        .forEach(dir => cell.classList.add(`neighbour-${dir}`));
    }
    this.maxCage = sums.length;
  }

  get selectedCell() {
    return this.#selectedCell;
  }

  set selectedCell(cell) {
    this.#selectedCell?.classList.remove('selected');
    cell.classList.add('selected');
    this.#selectedCell = cell;
  }

  getCellElement(cell, clazz) {
    return cell.getElementsByClassName(clazz)[0];
  }

  inputSum() {
    const cage = this.selectedCell.dataset.cage;
    if (cage == null) {
      return;
    }
    const sumCell = this.element.querySelector(`[data-cage="${cage}"]`);
    sumCell.classList.add('sum-active');
    const sumEl = this.getCellElement(sumCell, 'sum');
    sumEl.innerText = '';
    const inputListener = event => {
      if (/^\d$/.test(event.key)) {
        event.stopImmediatePropagation();
        sumEl.innerText += event.key;
        if (sumEl.innerText.length < 2) {
          return;
        }
      }
      sumCell.classList.remove('sum-active');
      document.removeEventListener('keydown', inputListener, true);
    }
    document.addEventListener('keydown', inputListener, true);
  }

  getCellAt(x, y) {
    return this.element.querySelector(`[data-x="${x}"][data-y="${y}"]`);
  }

  getNeighbours(cell) {
    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);
    const offsets = {
      'top': [0, -1],
      'right': [1, 0],
      'bottom': [0, 1],
      'left': [-1, 0],
      'top-right': [1, -1],
      'bottom-right': [1, 1],
      'bottom-left': [-1, 1],
      'top-left': [-1, -1]
    };
    const neighbours = {};
    for (const [dir, offset] of Object.entries(offsets)) {
      const [xOff, yOff] = offset;
      const nx = x + xOff;
      const ny = y + yOff;
      const nc = this.getCellAt(nx, ny);
      neighbours[dir] = nc;
    }
    return neighbours;
  }

  getCageCells(cage) {
    return [...this.element.querySelectorAll(`[data-cage="${cage}"]`)];
  }

  newCage() {
    this.deselectCage();
    this.toggleCage();
  }

  deselectCage() {
    this.getCageCells(this.currentCage)
      .forEach(c => c.classList.remove('cage'));
    this.currentCage = ++this.maxCage;
  }

  selectCage() {
    this.deselectCage();
    const cage = this.selectedCell.dataset.cage;
    if (cage != null) {
      this.currentCage = Number(cage);
      this.getCageCells(cage)
        .forEach(c => c.classList.add('cage'));
    }
  }

  getCageNieghbours(cell) {
    const cellCage = cell.dataset.cage;
    if (cellCage == null) {
      return {};
    }
    const neighbours = this.getNeighbours(cell);
    const cageCells = this.getCageCells(cellCage);
    const cageNeighbours = {};
    for (const [dir, cell] of Object.entries(neighbours)) {
      if (cageCells.includes(cell)) {
        cageNeighbours[dir] = cell;
      }
    }
    return cageNeighbours;
  }

  updateSumPosition(sum, cage) {
    if (sum == null || cage == null) {
      return;
    }
    const oldSumCell = this.element.querySelector(`[data-cage="${cage}"]:has(> .sum:not(:empty))`);
    if (oldSumCell) {
      this.getCellElement(oldSumCell, 'sum').innerText = '';
    }
    const newSumCell = this.element.querySelector(`[data-cage="${cage}"]`);
    if (newSumCell) {
      this.getCellElement(newSumCell, 'sum').innerText = sum;
    }
  }

  getSum(cage) {
    return this.element.querySelector(`[data-cage="${cage}"] > .sum:not(empty)`)?.innerText;
  }

  toggleCage() {
    //const cellCage = this.selectedCell.dataset.cage;
    //if (cellCage == this.currentCage) {
    //  return;
    //}
    const OPPOSITE = {
      'top': 'bottom',
      'bottom': 'top',
      'right': 'left',
      'left': 'right',
      'top-right': 'bottom-left',
      'top-left': 'bottom-right',
      'bottom-right': 'top-left',
      'bottom-left': 'top-right'
    };
    const cageBefore = this.selectedCell.dataset.cage;
    const sumBefore = this.getSum(this.selectedCell.dataset.cage);
    const cageAfter = this.currentCage;
    const sumAfter = this.getSum(this.currentCage);
    const toggleNeighbours =
      () => Object.entries(this.getCageNieghbours(this.selectedCell))
        .forEach(([dir, cell]) => {
          cell.classList.toggle(`neighbour-${OPPOSITE[dir]}`);
          this.selectedCell.classList.toggle(`neighbour-${dir}`);
        });
    this.getCellElement(this.selectedCell, 'sum').innerText = '';
    this.selectedCell.classList.add('cage');
    toggleNeighbours();
    this.selectedCell.dataset.cage = this.currentCage;
    toggleNeighbours();
    this.updateSumPosition(sumBefore, cageBefore);
    this.updateSumPosition(sumAfter, cageAfter);
  }

  insertDigit(digit) {
    this.getCellElement(this.selectedCell, 'digit').innerText = digit;
  }

  clearDigit() {
    this.getCellElement(this.selectedCell, 'digit').innerText = '';
  }

  move(key) {
    let x = Number(this.selectedCell.dataset.x);
    let y = Number(this.selectedCell.dataset.y);
    switch (key) {
      case 'ArrowRight':
        x += 1;
        break;
      case 'ArrowLeft':
        x -= 1;
        break;
      case 'ArrowDown':
        y += 1;
        break;
      case 'ArrowUp':
        y -= 1;
        break;
    }
    x = clamp(x, 0, 8);
    y = clamp(y, 0, 8);
    this.selectedCell = this.getCellAt(x, y);
  }
}
