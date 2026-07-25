import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/token-storage";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users, Plus, Mail, Shield, Scissors, Ruler, CheckCircle2,
  UserPlus, Trash2, Crown, Wrench, Eye, X,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

interface Member {
  member: { id: string; email?: string; role: string; status: string; permissions: string[]; joinedAt?: string };
  user?: { name?: string; email?: string; avatar?: string } | null;
}

const ROLES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  OWNER: { label: "Owner", icon: Crown, color: "text-amber-400 bg-amber-400/10" },
  MANAGER: { label: "Manager", icon: Shield, color: "text-purple-400 bg-purple-400/10" },
  DESIGNER: { label: "Designer", icon: Scissors, color: "text-blue-400 bg-blue-400/10" },
  PATTERN_MAKER: { label: "Pattern Maker", icon: Ruler, color: "text-cyan-400 bg-cyan-400/10" },
  TAILOR: { label: "Tailor", icon: Wrench, color: "text-green-400 bg-green-400/10" },
  PRODUCTION_STAFF: { label: "Production Staff", icon: Users, color: "text-orange-400 bg-orange-400/10" },
  QUALITY_INSPECTOR: { label: "Quality Inspector", icon: Eye, color: "text-teal-400 bg-teal-400/10" },
  ASSISTANT: { label: "Assistant", icon: UserPlus, color: "text-slate-400 bg-slate-400/10" },
};

const PERMISSION_OPTIONS = ["view_projects", "edit_projects", "manage_tasks", "view_finances", "manage_team", "approve_designs", "manage_files"];

export default function TeamPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "ASSISTANT" });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["production", "team"],
    queryFn: () => fetch(`${API_BASE}/api/production/team`, { headers }).then((r) => r.json()),
  });

  const inviteMutation = useMutation({
    mutationFn: () => fetch(`${API_BASE}/api/production/team/invite`, { method: "POST", headers, body: JSON.stringify(invite) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["production", "team"] }); setShowInvite(false); setInvite({ email: "", role: "ASSISTANT" }); toast({ description: "Team member invited!" }); },
    onError: () => toast({ description: "Invite failed", variant: "destructive" }),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => fetch(`${API_BASE}/api/production/team/${id}`, { method: "PATCH", headers, body: JSON.stringify({ role }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["production", "team"] }),
  });

  const removeMember = useMutation({
    mutationFn: (id: string) => fetch(`${API_BASE}/api/production/team/${id}`, { method: "DELETE", headers }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["production", "team"] }); toast({ description: "Member removed" }); },
  });

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-2xl font-serif font-medium">Team</h1>
          <p className="text-sm text-muted-foreground">{(members as Member[]).length} members</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="gap-2 bg-primary hover:bg-primary/80 rounded-lg"><Plus className="h-4 w-4" /> Invite Member</Button>
      </div>

      {showInvite && (
        <div className="px-6 py-3 border-b border-border bg-card flex flex-wrap gap-2 items-center">
          <Input value={invite.email} onChange={(e) => setInvite((f) => ({ ...f, email: e.target.value }))} placeholder="team@email.com" className="w-64" autoFocus />
          <select value={invite.role} onChange={(e) => setInvite((f) => ({ ...f, role: e.target.value }))} className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm">
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Button onClick={() => inviteMutation.mutate()} disabled={!invite.email.trim()} className="bg-primary hover:bg-primary/80">Send Invite</Button>
          <Button onClick={() => setShowInvite(false)} variant="outline"><X className="h-4 w-4" /></Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted/20 rounded-xl animate-pulse" />)}</div>
        ) : (members as Member[]).length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground/60">No team members yet</p>
            <p className="text-sm text-muted-foreground/40 mt-1">Invite your team to collaborate on projects</p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-3">
            {(members as Member[]).map((m) => {
              const role = ROLES[m.member.role] ?? ROLES.ASSISTANT;
              const name = m.user?.name ?? m.member.email ?? "Invited user";
              const initial = name[0]?.toUpperCase() ?? "?";
              return (
                <div key={m.member.id} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 group">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                    {m.user?.avatar ? <img src={m.user.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{name}</p>
                      <Badge className={cn("text-[10px] gap-1", role.color)}><role.icon className="h-3 w-3" /> {role.label}</Badge>
                      {m.member.status === "INVITED" && <Badge variant="outline" className="text-[10px]">Pending invite</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="h-3 w-3" /> {m.member.email ?? m.user?.email}</p>
                  </div>
                  <select value={m.member.role} onChange={(e) => updateRole.mutate({ id: m.member.id, role: e.target.value })}
                    className="text-xs bg-muted/30 border border-border rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button onClick={() => removeMember.mutate(m.member.id)} className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}

            <div className="bg-muted/20 border border-border rounded-xl p-4 mt-6">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Permission Levels</h3>
              <p className="text-xs text-muted-foreground">Roles control access: Owners and Managers have full access. Designers can manage projects and tasks. Production staff and tailors see assigned tasks. Quality inspectors review completed work.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
