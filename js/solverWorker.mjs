import Solver from './solver.mjs';

onmessage = ({data}) => {
  const solver = new Solver(
    data.digits,
    data.cages,
    data.sums
  );
  const result = solver.solve();
  postMessage(result);
}
