import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

interface Designer {
  id: string;
  name: string;
  brandName: string;
  location: string;
  specialization: string;
  experience: string;
  status: string;
  createdAt: string;
}

export default function AdminDesigners() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchDesigners = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/admin/designers`);
        if (!res.ok) throw new Error(`Failed to fetch designers (${res.status})`);
        const json = await res.json();
        if (!cancelled) setDesigners(json.data ?? json.designers ?? json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDesigners();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Designer Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and manage fashion designers on the platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Designers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
              {error}
            </div>
          ) : designers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No designers found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden sm:table-cell">Brand</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Location</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Specialization</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden lg:table-cell">Experience</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {designers.map((d) => (
                    <tr key={d.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 text-foreground font-medium">{d.name}</td>
                      <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">{d.brandName ?? "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">{d.location ?? "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground hidden lg:table-cell">{d.specialization ?? "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground hidden lg:table-cell">{d.experience ?? "—"}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            d.status === "active"
                              ? "bg-green-500/10 text-green-500"
                              : d.status === "pending"
                                ? "bg-yellow-500/10 text-yellow-500"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {d.status ?? "unknown"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground hidden md:table-cell">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
