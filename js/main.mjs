import Board from './board.mjs';
import Validator from './validator.mjs';

function setMessage(message) {
  document.getElementById('message').innerText = message;
}

function solve(board, solverWorker) {
  const loader = document.getElementById('loader');
  if (loader.classList.contains('loading')) {
    return;
  }
  const serializedBoard = board.export();
  const validator = new Validator(serializedBoard);
  const valid = validator.validate();
  if (valid) {
    setMessage(valid.message);
    board.highlight(valid.cells, valid.cages);
    return;
  }
  setMessage('Solving...');
  loader.classList.add('loading');
  const start = performance.now();
  solverWorker.onmessage = ({data}) => {
    const stop = performance.now();
    loader.classList.remove('loading');
    const msTime = Math.trunc(stop - start);
    if (Array.isArray(data)) {
      board.import(data, serializedBoard.cages, serializedBoard.sums);
      setMessage(`Ok\ntime: ${msTime}ms`);
    } else {
      setMessage(data.message);
    }
  }
  solverWorker.postMessage(serializedBoard);
}

function readFromFile(board) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = re => {
      try {
        const data = JSON.parse(re.target.result);
        board.import(data.digits, data.cages, data.sums);
        setMessage('');
      } catch (e) {
        setMessage('import error');
        console.error(e.message);
      }
    }
    reader.readAsText(file, 'utf-8');
  }
  input.click();
}

function saveToFile(board) {
  const content = JSON.stringify(board.export());
  const link = document.createElement('a');
  const file = new Blob([content], {type: 'application/json'});
  link.href = URL.createObjectURL(file);
  link.download = 'sudo';
  link.click();
  URL.revokeObjectURL(link.href);
}

function isMobile() {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|iphone|ipod|windows phone|blackberry|webos/.test(userAgent);
}


if (isMobile()) {
  alert('Big screen and physical keyboard required');
}
const boardElement = document.getElementById('board');
const board = new Board(boardElement);
// TODO handle errors
const solverWorker = new Worker('/js/solverWorker.mjs', { type: 'module' });
document.addEventListener('keydown', event => {
  const key = event.key;
  if (key.startsWith('Arrow')) {
    event.preventDefault();
    board.move(key);
  } else if (/^[1-9]$/.test(key)) {
    board.insertDigit(key);
  } else if (key === 'c') {
    board.clearDigit();
  } else if (key === ' ') {
    board.toggleCage()
  } else if (key === 'g') {
    board.selectCage();
  } else if (key === 'n') {
    board.newCage();
  } else if (key === 's') {
    board.inputSum();
  } else if (key === 'i') {
    readFromFile(board);
  } else if (key === 'e') {
    saveToFile(board);
  } else if (key === 'Enter') {
    solve(board, solverWorker);
  }
});
