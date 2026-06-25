# Nexis Benchmark

A desktop app for benchmarking local AI models. Drop in **ONNX** or **GGUF** models,
pick a task, run a standardized benchmark, and compare **throughput, latency, memory,
and accuracy** side by side across inference backends.

Built with **Tauri 2 + React 19 + Vite + Tailwind v4**. The Rust side owns the
benchmark harness and backend abstraction; React owns model management and the charts.

## Status

Working end-to-end pipeline. Two backends produce **real** measurements; the rest are
deterministic simulations behind the same `Engine` trait (`src-tauri/src/backend.rs`), so
more real engines slot in without touching the harness, IPC, or UI.

| Backend        | State                                                                   |
| -------------- | ----------------------------------------------------------------------- |
| `ONNX Runtime` | ✅ **real inference** via the `ort` crate (prebuilt binaries, no cmake)  |
| `nexis-ml-rs`  | ✅ **real** wgpu/ndarray training throughput (spawns `nexis-ml`, NDJSON) |
| `llama.cpp`    | ✅ **real GGUF inference** via prebuilt `llama-bench` (no cmake — locate it) |
| `Simulated`    | ✅ synthetic metrics, real event streaming (UI / protocol testing)       |

> The UI labels every result's provenance: a green **`real`** badge vs **`sim`**, plus a
> per-run note. `ONNX Runtime` runs real forward passes on the dropped `.onnx` model with
> synthesized inputs (so no accuracy figure); `nexis-ml-rs` measures real engine compute
> (training a standardized workload — it has no arbitrary-model inference path).

## Develop

```sh
pnpm install
pnpm tauri icon ./public/icon.svg   # one-time: generate src-tauri/icons/
pnpm tauri dev                      # run the desktop app
```

Run the UI in a plain browser (no Tauri) for fast iteration — it falls back to an
in-process simulator and seeds demo models:

```sh
pnpm dev   # http://localhost:1420
```

## Architecture

```
src/                         React app
  lib/
    types.ts                 domain types (mirror Rust serde, camelCase)
    api.ts                   IPC boundary — Tauri invoke/events, browser fallback
    mockEngine.ts            in-process simulator + demo data (browser mode)
  store/useBenchStore.ts     zustand store; subscribes to the engine stream
  modules/
    library/                 model library (drag-drop, format/task detection)
    backends/                backend selector
    config/                  benchmark protocol (runs, warm-up, tokens…)
    run/                     run/stop CTA
    results/                 dashboard: comparison chart + live run matrix + CSV

src-tauri/src/               Rust
  domain.rs                  shared types
  scan.rs                    path → ModelInfo (extension + filename heuristics)
  backend.rs                 Engine trait + registry (Nexis/ONNX/llama/Sim)
  simulate.rs                synthetic generator + streamed run loop
  bench.rs                   job runner; emits bench://progress / bench://result
  commands.rs                Tauri command surface
```

### Benchmark protocol

Each model × backend cell runs: load → `warmup` discarded runs → `runs` measured
iterations. The harness records per-run latency samples and derives tokens/sec,
first-token latency, mean / p50 / p95 latency, and peak memory. Cancellation is
cooperative (an `AtomicBool` per job).
