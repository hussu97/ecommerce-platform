interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 6 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-sand-divider last:border-0 animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="py-4 px-4">
              <div className="h-4 rounded bg-sand-divider/50 w-full max-w-[120px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
