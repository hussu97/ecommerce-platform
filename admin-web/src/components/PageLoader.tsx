export function PageLoader({ className }: { className?: string }) {
  return (
    <div
      className={
        className ?? "flex justify-center items-center min-h-[40vh] w-full py-20"
      }
    >
      <div
        className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin"
        aria-hidden
      />
    </div>
  );
}
