import { useState, useEffect } from "react";
import { Loader2, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const STATUSES = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  clientId: string;
  designerId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [moderating, setModerating] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        const res = await fetch(`${API_BASE}/api/admin/reviews?${params.toString()}`);
        if (!res.ok) throw new Error(`Failed to fetch reviews (${res.status})`);
        const json = await res.json();
        if (!cancelled) setReviews(json.data ?? json.reviews ?? json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchReviews();
    return () => { cancelled = true; };
  }, [statusFilter]);

  const moderateReview = async (reviewId: string, action: "APPROVED" | "REJECTED") => {
    try {
      setModerating(reviewId);
      const res = await fetch(`${API_BASE}/api/admin/reviews/${reviewId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error(`Failed to ${action.toLowerCase()} review`);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: action } : r)),
      );
    } catch (err) {
      console.error("Moderation failed:", err);
    } finally {
      setModerating(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Review Moderation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Approve or reject client reviews for designers
        </p>
      </div>

      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "All Statuses" : s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No reviews found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-5 space-y-3">
                {/* Rating stars */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < review.rating
                          ? "fill-yellow-500 text-yellow-500"
                          : "text-muted-foreground/30",
                      )}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">
                    {review.rating}/5
                  </span>
                </div>

                {/* Title & Comment */}
                {review.title && (
                  <h3 className="text-sm font-medium text-foreground">{review.title}</h3>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {review.comment}
                </p>

                {/* Images */}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {review.images.slice(0, 3).map((img, i) => (
                      <div
                        key={i}
                        className="w-14 h-14 rounded-md bg-muted overflow-hidden"
                      >
                        <img
                          src={img}
                          alt={`Review image ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    ))}
                    {(review.images.length ?? 0) > 3 && (
                      <span className="text-xs text-muted-foreground self-center">
                        +{review.images!.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                  <span>Client: {review.clientId.slice(0, 8)}…</span>
                  <span>Designer: {review.designerId.slice(0, 8)}…</span>
                </div>

                {/* Status badge + actions */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                      review.status === "APPROVED"
                        ? "bg-green-500/10 text-green-500"
                        : review.status === "REJECTED"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-yellow-500/10 text-yellow-500",
                    )}
                  >
                    {review.status}
                  </span>

                  {review.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={moderating === review.id}
                        onClick={() => moderateReview(review.id, "APPROVED")}
                        className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                      >
                        {moderating === review.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <ThumbsUp className="h-3 w-3 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={moderating === review.id}
                        onClick={() => moderateReview(review.id, "REJECTED")}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        {moderating === review.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <ThumbsDown className="h-3 w-3 mr-1" />
                        )}
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
