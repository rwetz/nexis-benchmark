import { create } from "zustand";
import {
  cancelBenchmark,
  listBackends,
  onProgress,
  onResult,
  runBenchmark,
} from "@/lib/api";
import { DEMO_MODELS } from "@/lib/mockEngine";
import { IS_TAURI } from "@/lib/platform";
import {
  type BackendId,
  type BackendInfo,
  type BenchConfig,
  type BenchJob,
  type BenchProgress,
  type BenchResult,
  type BenchRun,
  type ModelInfo,
  cellKey,
  DEFAULT_CONFIG,
} from "@/lib/types";

let uid = 0;
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${(uid++).toString(36)}`;

interface BenchState {
  initialized: boolean;
  models: ModelInfo[];
  backends: BackendInfo[];
  selectedModelIds: string[];
  selectedBackendIds: BackendId[];
  config: BenchConfig;

  running: boolean;
  jobId: string | null;
  run: BenchRun | null;
  history: BenchRun[];
  /** Live progress keyed by `${modelId}::${backendId}`. */
  progress: Record<string, BenchProgress>;

  init: () => Promise<void>;
  addModels: (models: ModelInfo[]) => void;
  removeModel: (id: string) => void;
  toggleModel: (id: string) => void;
  toggleBackend: (id: BackendId) => void;
  setConfig: (patch: Partial<BenchConfig>) => void;

  startRun: () => Promise<void>;
  cancelRun: () => Promise<void>;
  /** Cells (model × backend) eligible to run given current selection. */
  plannedMatrix: () => { modelId: string; backendId: BackendId }[];
}

export const useBenchStore = create<BenchState>((set, get) => ({
  initialized: false,
  models: [],
  backends: [],
  selectedModelIds: [],
  selectedBackendIds: ["nexis", "onnx"],
  config: DEFAULT_CONFIG,

  running: false,
  jobId: null,
  run: null,
  history: [],
  progress: {},

  init: async () => {
    if (get().initialized) return;
    const backends = await listBackends();
    const seedModels = IS_TAURI ? [] : DEMO_MODELS;
    set({
      initialized: true,
      backends,
      models: seedModels,
      selectedModelIds: seedModels.map((m) => m.id),
      selectedBackendIds: backends
        .filter((b) => b.available && (b.id === "nexis" || b.id === "onnx" || b.id === "sim"))
        .map((b) => b.id)
        .slice(0, 2),
    });
  },

  addModels: (incoming) =>
    set((s) => {
      const byId = new Map(s.models.map((m) => [m.path, m]));
      for (const m of incoming) byId.set(m.path, m);
      const models = [...byId.values()];
      const newIds = incoming.map((m) => m.id);
      const selectedModelIds = [...new Set([...s.selectedModelIds, ...newIds])];
      return { models, selectedModelIds };
    }),

  removeModel: (id) =>
    set((s) => ({
      models: s.models.filter((m) => m.id !== id),
      selectedModelIds: s.selectedModelIds.filter((x) => x !== id),
    })),

  toggleModel: (id) =>
    set((s) => ({
      selectedModelIds: s.selectedModelIds.includes(id)
        ? s.selectedModelIds.filter((x) => x !== id)
        : [...s.selectedModelIds, id],
    })),

  toggleBackend: (id) =>
    set((s) => ({
      selectedBackendIds: s.selectedBackendIds.includes(id)
        ? s.selectedBackendIds.filter((x) => x !== id)
        : [...s.selectedBackendIds, id],
    })),

  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),

  plannedMatrix: () => {
    const s = get();
    const backends = new Map(s.backends.map((b) => [b.id, b]));
    const cells: { modelId: string; backendId: BackendId }[] = [];
    for (const modelId of s.selectedModelIds) {
      const model = s.models.find((m) => m.id === modelId);
      if (!model) continue;
      for (const backendId of s.selectedBackendIds) {
        const b = backends.get(backendId);
        if (!b || !b.available) continue;
        if (!b.supports.includes(model.format)) continue;
        cells.push({ modelId, backendId });
      }
    }
    return cells;
  },

  startRun: async () => {
    const s = get();
    if (s.running) return;
    const matrix = s.plannedMatrix();
    if (matrix.length === 0) return;

    const jobId = nextId("job");
    const models = s.models.filter((m) => s.selectedModelIds.includes(m.id));
    const run: BenchRun = {
      id: jobId,
      createdAt: new Date().toISOString(),
      config: s.config,
      matrix,
      results: [],
    };
    set({ running: true, jobId, run, progress: {} });

    const job: BenchJob = {
      jobId,
      config: s.config,
      models,
      backendIds: s.selectedBackendIds,
    };
    await runBenchmark(job);
  },

  cancelRun: async () => {
    const { jobId } = get();
    if (jobId) await cancelBenchmark(jobId);
    set({ running: false });
  },
}));

// ── Engine stream → store ────────────────────────────────────────────────────

function handleProgress(p: BenchProgress) {
  const s = useBenchStore.getState();
  if (p.jobId !== s.jobId) return;
  useBenchStore.setState((cur) => ({
    progress: { ...cur.progress, [cellKey(p.modelId, p.backendId)]: p },
  }));
}

function handleResult(r: BenchResult) {
  useBenchStore.setState((cur) => {
    if (!cur.run) return {};
    // Only accept results for cells the current run actually requested.
    const inMatrix = cur.run.matrix.some(
      (c) => c.modelId === r.modelId && c.backendId === r.backendId,
    );
    if (!inMatrix) return {};
    const results = [...cur.run.results.filter((x) => x.id !== r.id), r];
    const run = { ...cur.run, results };
    const done = run.matrix.length > 0 && results.length >= run.matrix.length;
    return {
      run,
      running: done ? false : cur.running,
      history: done ? [run, ...cur.history.filter((h) => h.id !== run.id)] : cur.history,
    };
  });
}

onProgress(handleProgress);
onResult(handleResult);
