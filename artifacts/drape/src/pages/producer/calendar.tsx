import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/token-storage";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Clock,
  MapPin, Users, X, Video, Package, Ruler, Truck, Flag,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

interface CalEvent {
  id: string; title: string; type: string; startTime: string; endTime?: string;
  location?: string; notes?: string; isAllDay: boolean;
}

const EVENT_TYPES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  MEETING: { label: "Meeting", color: "bg-blue-400", icon: Users },
  CONSULTATION: { label: "Consultation", color: "bg-purple-400", icon: Video },
  DEADLINE: { label: "Deadline", color: "bg-red-400", icon: Clock },
  FITTING: { label: "Fitting", color: "bg-amber-400", icon: Ruler },
  DELIVERY: { label: "Delivery", color: "bg-green-400", icon: Truck },
  MILESTONE: { label: "Milestone", color: "bg-cyan-400", icon: Flag },
  OTHER: { label: "Other", color: "bg-slate-400", icon: CalIcon },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const [current, setCurrent] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "MEETING", date: "", time: "", location: "" });

  const year = current.getFullYear();
  const month = current.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const { data: events = [] } = useQuery({
    queryKey: ["production", "calendar", year, month],
    queryFn: () => fetch(`${API_BASE}/api/production/calendar?start=${monthStart.toISOString()}&end=${new Date(year, month + 1, 0, 23, 59).toISOString()}`, { headers }).then((r) => r.json()),
  });

  const createEvent = useMutation({
    mutationFn: () => fetch(`${API_BASE}/api/production/calendar`, {
      method: "POST", headers,
      body: JSON.stringify({ title: form.title, type: form.type, startTime: new Date(`${form.date}T${form.time || "09:00"}`).toISOString(), location: form.location || null }),
    }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["production", "calendar"] }); setShowForm(false); setForm({ title: "", type: "MEETING", date: "", time: "", location: "" }); toast({ description: "Event added!" }); },
  });

  // Build calendar grid
  const firstDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsForDay = (day: number) =>
    (events as CalEvent[]).filter((e) => {
      const d = new Date(e.startTime);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const today = new Date();
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-serif font-medium">{MONTHS[month]} {year}</h1>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrent(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrent(new Date())}>Today</Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrent(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-primary hover:bg-primary/80 rounded-lg"><Plus className="h-4 w-4" /> New Event</Button>
      </div>

      {showForm && (
        <div className="px-6 py-3 border-b border-border bg-card flex flex-wrap gap-2 items-center">
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Event title..." className="w-56" autoFocus />
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm">
            {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-40" />
          <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="w-32" />
          <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location..." className="w-40" />
          <Button onClick={() => createEvent.mutate()} disabled={!form.title || !form.date} className="bg-primary hover:bg-primary/80">Add</Button>
          <Button onClick={() => setShowForm(false)} variant="outline"><X className="h-4 w-4" /></Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-muted/30 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">{d}</div>
          ))}
          {cells.map((day, i) => (
            <div key={i} className={cn("bg-background min-h-[110px] p-2", !day && "bg-muted/10")}>
              {day && (
                <>
                  <div className={cn("text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                    isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{day}</div>
                  <div className="space-y-1">
                    {eventsForDay(day).slice(0, 3).map((e) => {
                      const t = EVENT_TYPES[e.type] ?? EVENT_TYPES.OTHER;
                      return (
                        <div key={e.id} className={cn("text-[10px] px-1.5 py-0.5 rounded text-white truncate flex items-center gap-1", t.color)} title={e.title}>
                          <t.icon className="h-2.5 w-2.5 shrink-0" /> {e.title}
                        </div>
                      );
                    })}
                    {eventsForDay(day).length > 3 && <p className="text-[10px] text-muted-foreground">+{eventsForDay(day).length - 3} more</p>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          {Object.entries(EVENT_TYPES).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className={cn("w-2.5 h-2.5 rounded-sm", v.color)} /> {v.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
