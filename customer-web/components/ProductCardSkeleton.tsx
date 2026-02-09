"use client";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="aspect-[4/5] rounded-xl overflow-hidden bg-sand-divider/50" />
      <div className="space-y-2">
        <div className="h-4 w-3/4 rounded bg-sand-divider/50" />
        <div className="h-3 w-full rounded bg-sand-divider/40" />
        <div className="h-3 w-2/3 rounded bg-sand-divider/40" />
        <div className="h-4 w-1/3 rounded bg-sand-divider/50 mt-1" />
      </div>
    </div>
  );
}
