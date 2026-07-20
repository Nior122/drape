import { useState } from "react";
import {
  useGetProducerClients,
  getGetProducerClientsQueryKey,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Users, Search, Ruler, ChevronDown, ChevronUp, MapPin } from "lucide-react";

type Client = {
  clientId: string; clientName: string | null; clientEmail: string;
  clientCity: string | null; clientCountry: string | null;
  orderCount: number; totalSpend: number; lastOrderAt: string | null;
  measurements: { unit: string; data: Record<string, number | null>; notes: string | null } | null;
};

const KEY_MEASUREMENTS = ["bust", "waist", "hips", "height", "shoulder_width"];

export default function ProducerClients() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useGetProducerClients({
    query: { queryKey: getGetProducerClientsQueryKey() },
  });
  const clients = (data as Client[] | undefined) ?? [];

  const filtered = clients.filter(
    (c) =>
      !search ||
      (c.clientName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      c.clientEmail.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Clients</h1>
        <p className="text-sm text-white/40 mt-0.5">{clients.length} client{clients.length !== 1 ? "s" : ""} total</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients…"
          className="pl-9 bg-[#1A1A1A] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#C08B4E]/30"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#1A1A1A] rounded-xl border border-white/5">
          <Users className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/40">{search ? "No clients match your search" : "No clients yet"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => {
            const isOpen = expanded === client.clientId;
            const initials = (client.clientName ?? client.clientEmail)
              .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
            const keyMeas = client.measurements
              ? KEY_MEASUREMENTS.map((k) => ({ key: k, val: client.measurements!.data[k] })).filter((m) => m.val != null)
              : [];

            return (
              <div key={client.clientId} className="bg-[#1A1A1A] rounded-xl border border-white/5 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : client.clientId)}
                  className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-[#C08B4E]/15 flex items-center justify-center text-[#C08B4E] text-sm font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{client.clientName ?? client.clientEmail}</p>
                    <p className="text-xs text-white/40">{client.clientEmail}</p>
                    {(client.clientCity || client.clientCountry) && (
                      <p className="text-[10px] text-white/30 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {[client.clientCity, client.clientCountry].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right mr-2">
                    <p className="text-sm font-semibold text-white">{client.orderCount}</p>
                    <p className="text-[10px] text-white/30">order{client.orderCount !== 1 ? "s" : ""}</p>
                    {client.totalSpend > 0 && (
                      <p className="text-xs text-[#C08B4E] font-medium mt-0.5">£{(client.totalSpend / 100).toFixed(0)}</p>
                    )}
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-white/20 shrink-0" /> : <ChevronDown className="h-4 w-4 text-white/20 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="border-t border-white/5 px-4 pb-4 pt-3">
                    {keyMeas.length > 0 ? (
                      <>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Ruler className="h-3 w-3 text-[#C08B4E]" />
                          <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                            Key Measurements ({client.measurements?.unit})
                          </p>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {keyMeas.map(({ key, val }) => (
                            <div key={key} className="bg-white/5 rounded-lg px-2.5 py-2 text-center">
                              <p className="text-[9px] text-white/30 capitalize mb-0.5">{key.replace(/_/g, " ")}</p>
                              <p className="text-sm font-bold text-white">{val}</p>
                            </div>
                          ))}
                        </div>
                        {client.measurements?.notes && (
                          <p className="text-xs text-white/40 italic mt-2">{client.measurements.notes}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-white/30 italic">No measurements on file.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
