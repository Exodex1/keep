import { cn } from "@/lib/utils";

export function KeepMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-6 text-foreground", className)}
    >
      <rect x="6" y="3.5" width="12" height="17" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 3.5v6.5l3-1.8 3 1.8V3.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
