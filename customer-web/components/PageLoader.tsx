"use client";

import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  className?: string;
}

export function PageLoader({ className }: PageLoaderProps) {
  return (
    <div
      className={
        className ??
        "flex justify-center items-center min-h-[40vh] w-full py-20"
      }
    >
      <Loader2
        className="h-10 w-10 animate-spin text-primary"
        aria-hidden="true"
      />
    </div>
  );
}
