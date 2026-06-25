import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { BACKEND_COLOR, BACKEND_SHORT } from "@/lib/backendMeta";
import { Download04Icon, HugeiconsIcon } from "@/components/icons";
import { exportRunCsv } from "@/lib/api";
import { cn } from "@/lib/utils";
import { type BackendId, type BenchResult } from "@/lib/types";
import { useBenchStore } from "@/store/useBenchStore";
import { ComparisonChart } from "./ComparisonChart";
import { RunMatrix } from "./RunMatrix";
import { METRICS, metricByKey, type MetricKey } from "./metrics";

export function ResultsDashboard() {
  const run = useBenchStore((s) => s.run);
  const models = useBenchStore((s) => s.models);
  const running = useBenchStore((s) => s.running);
  const [metricKey, setMetricKey] = useState<MetricKey>("tokensPerSec");

  const activeBackends = useMemo<BackendId[]>(() => {
    if (!run) return [];
    return [...new Set(run.matrix.map((c) => c.backendId))];
  }, [run]);

  const runModels = useMemo(() => {
    if (!run) return [];
    const ids = new Set(run.matrix.map((c) => c.modelId));
    return models.filter((m) => ids.has(m.id));
  }, [run, models]);

  if (!run) return <EmptyState />;

  const metric = metricByKey(metricKey);
  const completed = run.results.length;
  const total = run.matrix.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetricKey(m.key)}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-medium whitespace-nowrap transition-colors",
                metricKey === m.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {completed}/{total} {running ? "running…" : "done"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportRunCsv(run, models)}
            disabled={completed === 0}
            className="rounded-md"
          >
            <HugeiconsIcon icon={Download04Icon} size={15} strokeWidth={1.8} />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto nexis-scrollbar">
        <div className="@container mx-auto flex w-full max-w-[1700px] flex-col gap-6 px-5 py-5 lg:px-8 2xl:px-10">
          {/* Comparison */}
          <section className="rounded-2xl border border-border bg-card p-5 lg:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">{metric.label}</h2>
                <p className="text-[11px] text-muted-foreground">
                  {metric.better === "high" ? "Higher is better" : "Lower is better"} · ★ marks the
                  winner per model
                </p>
              </div>
              <Legend backendIds={activeBackends} />
            </div>
            <ComparisonChart
              metric={metric}
              models={runModels}
              backendIds={activeBackends}
              results={run.results}
            />
            <MetricsProvenance results={run.results} />
          </section>

          {/* Per-cell detail */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Run matrix
            </h2>
            <RunMatrix />
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricsProvenance({ results }: { results: BenchResult[] }) {
  const hasSim = results.some((r) => r.simulated);
  const real = results.find((r) => !r.simulated && r.status === "done");
  if (!hasSim && !real) return null;
  return (
    <div className="mt-4 flex flex-col gap-1.5 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
      {real && (
        <p>
          <span className="font-medium text-emerald-500">● Real.</span>{" "}
          {real.note ??
            "Measured from a live engine."}
        </p>
      )}
      {hasSim && (
        <p>
          <span className="font-medium text-foreground">● Simulated.</span> Synthetic metrics — the
          harness, protocol, and UI are real; ONNX Runtime drops in behind the same interface next.
        </p>
      )}
      {real && hasSim && (
        <p className="text-muted-foreground/70">
          Note: real and simulated bars use different units and aren't directly comparable yet.
        </p>
      )}
    </div>
  );
}

function Legend({ backendIds }: { backendIds: BackendId[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {backendIds.map((b) => (
        <span key={b} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: BACKEND_COLOR[b] }}
          />
          {BACKEND_SHORT[b]}
        </span>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-8">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="aurora-border grid size-16 place-items-center rounded-2xl bg-card">
          <BrandMark size={34} />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Ready to benchmark</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick models and backends on the left, set the protocol, then hit{" "}
            <span className="font-medium text-foreground">Run benchmark</span>. Results stream in
            live — throughput, latency, memory, and accuracy, side by side.
          </p>
        </div>
      </div>
    </div>
  );
}
