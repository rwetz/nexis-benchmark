# Enhancements & Roadmap

A running list of ideas and follow-ups for Nexis Benchmark. Roughly ordered by
value within each section; nothing here is committed work yet.

## Backends

- [ ] **llama.cpp / GGUF backend** — real inference + tokens/sec for `.gguf` models.
      Needs a cmake build of llama.cpp (via `llama-cpp-2` or a bundled `llama-bench`).
      Would make the GGUF half of the model library real, not just simulated.
- [ ] **ONNX GPU execution providers** — enable CUDA / DirectML / CoreML via `ort`
      features so the ONNX backend can benchmark CPU *vs* GPU on the same model.
- [ ] **nexis-ml-rs real inference** — when the engine gains an arbitrary-model
      inference path, swap the training-throughput benchmark for true inference so it
      compares apples-to-apples with ONNX Runtime. Until then, keep the (honest)
      training-throughput micro-benchmark.
- [ ] **candle / burn inference backend** — a pure-Rust inference path as another
      comparison point (and dogfoods the Nexis ML stack).
- [ ] **Backend warm-pool** — keep a loaded session alive across runs to separate
      cold-start cost from steady-state throughput.

## Benchmark fidelity

- [ ] **Real accuracy** — run classification/embedding against a bundled standard
      dataset (e.g. SST-2 sample, STS-B) so the accuracy column is real, not blank.
- [ ] **Real model metadata** — parse the GGUF header (arch, params, quant, context
      length) and ONNX metadata (opset, producer, IR version) instead of filename
      heuristics; show them in the model card.
- [ ] **Token-aware generation** — for true generation backends, measure first-token
      latency and inter-token latency from a streaming decode, not a single forward pass.
- [ ] **Better memory attribution** — ONNX runs in-process, so peak memory is an RSS
      delta today. Investigate ORT allocator stats / arena metrics for a cleaner figure.
- [ ] **Input realism** — let the user supply a sample input (text / image / tensor)
      instead of synthesized zeros/ones, for representative latencies.
- [ ] **Statistical rigor** — show stdev / confidence intervals; flag noisy runs;
      auto-pick run count until the median stabilizes.

## UX

- [ ] **Run history** — persist completed runs to disk and add a history view to
      reload, diff, and compare past runs.
- [ ] **More charts** — latency distribution histogram per cell; scatter of memory vs
      throughput; a "speedup vs baseline" view.
- [ ] **Config presets** — save/load benchmark protocols (e.g. "quick smoke", "full
      sweep"); per-task defaults.
- [ ] **Command palette (⌘K)** — `cmdk` is already a dependency; wire add-model,
      run, switch-metric, export.
- [ ] **Keyboard shortcuts** — run (⌘↵), stop (Esc), switch metric, toggle theme.
- [ ] **Settings window** — configurable simulated/standardized workload size, thread
      counts, default device.
- [ ] **Empty/error polish** — richer error surfaces when a model fails to load
      (bad opset, missing input), with actionable hints.

## Data & export

- [ ] **Shareable report** — export a self-contained HTML report (charts + table) and
      a JSON results file alongside the CSV.
- [ ] **Clipboard** — copy a results table / a single cell's metrics as Markdown.
- [ ] **Compare exports** — import two result sets and diff them.

## Packaging & distribution

- [ ] **Bundle `onnxruntime.dll`** as a Tauri resource so `tauri build` produces a
      working installer (dev already works via `ort`'s `copy-dylibs`).
- [ ] **macOS / Linux builds** — verify the borderless chrome overrides and ORT
      binaries on the other platforms; add the Linux config if missing.
- [ ] **Code signing / notarization** for distributable installers.
- [ ] **Auto-update** via the Tauri updater.

## Engineering

- [ ] **CI** — GitHub Actions: `tsc`, `vite build`, `cargo check`/`clippy`,
      `cargo test` (the ONNX smoke test runs when `ONNX_SMOKE_MODEL` is set).
- [ ] **Frontend tests** — unit-test the store reducers and the CSV/metric formatters.
- [ ] **Telemetry-free crash logging** — surface Rust panics from the benchmark thread
      to the UI instead of silently ending a run.
- [ ] **Cancellation hardening** — confirm GGUF/long-running backends honor cooperative
      cancel + process-tree kill on Windows.
