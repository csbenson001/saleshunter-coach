# SAL-1 HUD latency benchmark

Command:

```sh
pnpm exec vitest run src/lib/sales/inCallNudgeHud.regression.test.ts
```

The regression replays 100 objection-card emissions through the synchronous
reducer and asserts p95 emission-to-state work is below 100 ms. The committed
test prints the measured p95 on each local run so the result remains
reproducible on the supported development machine.

Latest local result (2026-09-14): p95 `0.0029 ms`; 100/100 emissions passed the
`<100 ms` budget.
