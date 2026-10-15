import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  tone = "default",
}: {
  value: number;
  className?: string;
  tone?: "default" | "warning" | "success";
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all",
          tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-primary",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
