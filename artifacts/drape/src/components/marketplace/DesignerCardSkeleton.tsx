export function DesignerCardSkeleton() {
  return (
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden animate-pulse">
      <div className="h-52 bg-muted" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/5" />
            <div className="h-3 bg-muted rounded w-4/5" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="h-3 bg-muted rounded w-16" />
          <div className="h-3 bg-muted rounded w-16" />
          <div className="h-3 bg-muted rounded w-12" />
        </div>
        <div className="flex justify-between pt-1 border-t border-border/50">
          <div className="h-3 bg-muted rounded w-20" />
          <div className="h-3 bg-muted rounded w-24" />
        </div>
      </div>
    </div>
  );
}
