"use client";

export function PdpSkeleton() {
  return (
    <div className="flex flex-col min-h-screen bg-background-light md:min-h-0">
      <div className="md:grid md:grid-cols-2 md:gap-10 md:items-start md:py-8 md:max-w-6xl md:mx-auto md:w-full md:px-4 animate-pulse">
        <div className="w-full aspect-[4/5] md:aspect-square bg-sand-divider/50 rounded-xl md:rounded-2xl" />
        <div className="px-4 pb-24 md:pb-0 md:pt-0 pt-4 space-y-6">
          <div className="h-6 w-1/3 rounded bg-sand-divider/50" />
          <div className="h-8 w-2/3 rounded bg-sand-divider/50 serif-font" />
          <div className="h-6 w-1/4 rounded bg-sand-divider/50" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-sand-divider/40" />
            <div className="h-3 w-full rounded bg-sand-divider/40" />
            <div className="h-3 w-2/3 rounded bg-sand-divider/40" />
          </div>
          <div className="h-12 w-full rounded-xl bg-sand-divider/50" />
        </div>
      </div>
    </div>
  );
}
