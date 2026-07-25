import { useState, useEffect } from "react";
import { getToken } from "@/lib/token-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X, ImageIcon, Trash2, Package } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

type PortfolioItem = {
  id: string; title: string; description: string | null;
  imageUrls: string[]; category: string | null; tags: string[];
  createdAt: string;
};

const CATEGORIES = ["Wedding", "Casual", "Luxury", "Traditional", "Streetwear", "Evening", "Bridal", "Menswear"];

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    fetch(`${API_BASE}/api/designer/portfolio`, { headers })
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const addImageUrl = () => {
    if (imageUrl.trim() && !imageUrls.includes(imageUrl.trim())) {
      setImageUrls((prev) => [...prev, imageUrl.trim()]);
      setImageUrl("");
    }
  };

  const createItem = async () => {
    if (!title.trim()) return;
    const res = await fetch(`${API_BASE}/api/designer/portfolio`, {
      method: "POST", headers,
      body: JSON.stringify({ title, description, category: category || null, imageUrls, tags: [] }),
    });
    if (res.ok) {
      const item = await res.json();
      setItems((prev) => [item, ...prev]);
      setTitle(""); setDescription(""); setCategory(""); setImageUrls([]);
      setShowForm(false);
    }
  };

  const deleteItem = async (id: string) => {
    setDeleting(id);
    await fetch(`${API_BASE}/api/designer/portfolio/${id}`, { method: "DELETE", headers });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeleting(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-[#C08B4E]" /></div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-medium">Portfolio</h1>
          <p className="text-sm text-white/40 mt-1">Showcase your best work to potential clients.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#C08B4E] hover:bg-[#C08B4E]/80 text-white rounded-lg gap-2">
          <Plus className="h-4 w-4" /> {showForm ? "Cancel" : "Add Item"}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-[#111] border border-white/10 rounded-xl p-6 mb-8 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Silk Evening Gown" className="bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your design..." className="bg-white/5 border-white/10 text-white min-h-[80px]" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Image URLs</label>
            <div className="flex gap-2">
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white flex-1" />
              <Button onClick={addImageUrl} variant="outline" className="border-white/10 text-white/70">Add</Button>
            </div>
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-1 bg-white/5 rounded px-2 py-1 text-xs text-white/60">
                    <ImageIcon className="h-3 w-3" /> {url.slice(0, 30)}...
                    <button onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}><X className="h-3 w-3 ml-1 hover:text-red-400" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={createItem} disabled={!title.trim()} className="bg-[#C08B4E] hover:bg-[#C08B4E]/80 text-white rounded-lg">Save to Portfolio</Button>
        </div>
      )}

      {/* Portfolio grid */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-white/40">Your portfolio is empty</p>
          <p className="text-sm mt-1">Add your first design to showcase your work.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group bg-[#111] border border-white/10 rounded-xl overflow-hidden hover:border-[#C08B4E]/30 transition-colors">
              {item.imageUrls.length > 0 ? (
                <div className="aspect-[4/3] bg-white/5 overflow-hidden">
                  <img src={item.imageUrls[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="aspect-[4/3] bg-white/5 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-white/20" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium truncate">{item.title}</h3>
                    {item.category && <span className="text-[10px] text-[#C08B4E]/60 uppercase tracking-wider">{item.category}</span>}
                  </div>
                  <button onClick={() => deleteItem(item.id)} disabled={deleting === item.id} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {item.description && <p className="text-xs text-white/40 mt-2 line-clamp-2">{item.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
