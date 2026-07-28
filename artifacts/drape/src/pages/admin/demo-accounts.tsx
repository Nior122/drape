import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Copy, Download, Printer, FileSpreadsheet, FileText, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

interface DemoAccount {
  id: string; name: string | null; email: string; role: string;
  onboardingComplete: boolean; createdAt: string; city: string | null;
  brandName: string | null; defaultPassword: string; verificationStatus: string;
}

export default function AdminDemoAccountsPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`${API_BASE}/api/admin/demo-accounts?${params}`, { credentials: "include" });
      const data = await res.json();
      setAccounts(data.accounts || []);
      setTotal(data.total || 0);
    } catch { setAccounts([]); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);
  const totalPages = Math.ceil(total / 50);

  const copyToClipboard = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch {}
  };
  const copyCredentials = (a: DemoAccount) => {
    copyToClipboard(`Email: ${a.email}\nPassword: ${a.defaultPassword}`, `cred-${a.id}`);
  };
  const exportCsv = () => {
    window.open(`${API_BASE}/api/admin/demo-accounts?format=csv&${new URLSearchParams({ search, role: roleFilter }).toString()}`, "_blank");
  };
  const handlePrint = () => { window.print(); };
  const exportExcel = () => {
    const headers = ["Name","Email","Password","Role","City","State","BusinessName","VerificationStatus","CreatedAt"];
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(",")];
    for (const a of accounts) {
      lines.push(headers.map(h => {
        switch (h) {
          case "Name": return esc(a.name ?? "");
          case "Email": return esc(a.email);
          case "Password": return esc(a.defaultPassword);
          case "Role": return esc(a.role);
          case "City": return esc(a.city ?? "");
          case "State": return esc("");
          case "BusinessName": return esc(a.brandName ?? "");
          case "VerificationStatus": return esc(a.verificationStatus);
          case "CreatedAt": return esc(new Date(a.createdAt).toISOString().split("T")[0]);
          default: return "";
        }
      }).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `demo_accounts_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-medium text-foreground">Demo Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} demo accounts — designers, clients &amp; admins</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPasswords(!showPasswords)} className="gap-2">
            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPasswords ? "Hide" : "Show"} Passwords
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2"><FileText className="h-4 w-4" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2"><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-card-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="bg-card border border-card-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
          <option value="">All Roles</option>
          <option value="DESIGNER">Designers</option>
          <option value="PRODUCER">Producers</option>
          <option value="CLIENT">Clients</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      <div ref={printRef} className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border bg-muted/30">
                <th className="text-left py-3.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                <th className="text-left py-3.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Email</th>
                <th className="text-left py-3.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Role</th>
                <th className="text-left py-3.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">City</th>
                <th className="text-left py-3.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Business</th>
                <th className="text-left py-3.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Verification</th>
                {showPasswords && <th className="text-left py-3.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Password</th>}
                <th className="text-left py-3.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Created</th>
                <th className="text-right py-3.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {loading ? (
                <tr><td colSpan={showPasswords ? 9 : 8} className="py-10 text-center text-muted-foreground">Loading...</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan={showPasswords ? 9 : 8} className="py-10 text-center text-muted-foreground">No accounts found</td></tr>
              ) : accounts.map((a) => (
                <tr key={a.id} className="hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-4"><span className="font-medium text-foreground">{a.name || "—"}</span></td>
                  <td className="py-3 px-4"><span className="text-muted-foreground">{a.email}</span></td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                      a.role === "ADMIN" ? "bg-red-500/10 text-red-400" :
                      a.role === "DESIGNER" || a.role === "PRODUCER" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-400"
                    }`}>{a.role}</span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{a.city || "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground">{a.brandName || "—"}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs ${
                      a.verificationStatus === "VERIFIED" ? "text-green-400" :
                      a.verificationStatus === "PENDING" ? "text-yellow-400" : "text-muted-foreground"
                    }`}>{a.verificationStatus}</span>
                  </td>
                  {showPasswords && (
                    <td className="py-3 px-4"><code className="text-xs bg-background px-2 py-0.5 rounded font-mono">{a.defaultPassword}</code></td>
                  )}
                  <td className="py-3 px-4 text-muted-foreground text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => copyToClipboard(a.email, `email-${a.id}`)} title="Copy email"
                        className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                        {copiedId === `email-${a.id}` ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => copyToClipboard(a.defaultPassword, `pwd-${a.id}`)} title="Copy password"
                        className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                        {copiedId === `pwd-${a.id}` ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => copyCredentials(a)} title="Copy credentials"
                        className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                        {copiedId === `cred-${a.id}` ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Download className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 border-t border-card-border">
            {Array.from({ length: Math.min(totalPages, 10) }).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  page === i + 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground border border-card-border"
                }`}>{i + 1}</button>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white; color: black; }
          table { font-size: 10pt; }
        }
      `}</style>
    </div>
  );
}
