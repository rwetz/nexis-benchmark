import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert02Icon, HugeiconsIcon } from "@/components/icons";
import { BACKEND_COLOR } from "@/lib/backendMeta";
import { cn } from "@/lib/utils";
import { type BackendInfo } from "@/lib/types";
import { useBenchStore } from "@/store/useBenchStore";

export function BackendSelector() {
  const backends = useBenchStore((s) => s.backends);
  const selected = useBenchStore((s) => s.selectedBackendIds);
  const toggleBackend = useBenchStore((s) => s.toggleBackend);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backends</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {backends.map((b) => (
          <BackendRow
            key={b.id}
            backend={b}
            selected={selected.includes(b.id)}
            onToggle={() => b.available && toggleBackend(b.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function BackendRow({
  backend,
  selected,
  onToggle,
}: {
  backend: BackendInfo;
  selected: boolean;
  onToggle: () => void;
}) {
  const disabled = !backend.available;
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
        disabled && "cursor-not-allowed opacity-55",
        !disabled && selected
          ? "border-border bg-muted/60"
          : "border-transparent bg-muted/30 hover:bg-muted",
      )}
    >
      <span
        className="size-2.5 shrink-0 rounded-full ring-2 ring-inset ring-black/0"
        style={{
          backgroundColor: selected ? BACKEND_COLOR[backend.id] : "transparent",
          boxShadow: selected ? `0 0 0 1px ${BACKEND_COLOR[backend.id]}` : "inset 0 0 0 1.5px var(--border)",
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium leading-tight">{backend.label}</span>
          {backend.version && (
            <span className="font-mono text-[10px] text-muted-foreground">v{backend.version}</span>
          )}
          <span className="rounded bg-muted px-1 py-px text-[9.5px] font-semibold uppercase text-muted-foreground">
            {backend.device}
          </span>
        </div>
        <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
          {backend.description}
        </div>
      </div>
      {disabled && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0 text-muted-foreground">
              <HugeiconsIcon icon={Alert02Icon} size={14} strokeWidth={1.8} />
            </span>
          </TooltipTrigger>
          <TooltipContent>Not available on this machine</TooltipContent>
        </Tooltip>
      )}
    </button>
  );
}
