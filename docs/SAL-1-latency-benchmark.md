# SAL-1 HUD latency benchmark

Command:

```sh
pnpm exec vitest run src/lib/sales/inCallNudgeHud.regression.test.ts
```

The regression replays 100 objection-card emissions through the synchronous
reducer and asserts p95 emission-to-state work is below 100 ms. The HUD
component test separately replays the same 100 emissions through React's
renderer and `useLayoutEffect` commit boundary, asserting p95
emission-to-commit latency below 100 ms. Both committed tests print their
measured p95 on each local run so the results remain reproducible on the
supported development machine.

Latest local result (2026-09-14): reducer p95 `0.0033 ms`; React commit p95
`1.0000 ms`; 100/100 emissions passed the `<100 ms` budget at both boundaries.
