import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "@/lib/token-storage";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, ImageIcon, Sparkles, Search, Palette, Scissors,
  TrendingUp, Layout, Layers, Camera, Download, Plus, X,
  Trash2, Eye, Copy, Star, Loader2, FileImage, Wand2,
  Columns, Grid3X3, ArrowRight, Check, Bookmark, Archive,
  Zap, SlidersHorizontal, Clock, RefreshCw, PanelRightOpen,
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

// ── Types ────────────────────────────────────────────────────
interface VisionImage {
  id: string; originalName: string; originalPath: string; thumbnailPath?: string;
  mimeType: string; fileSize?: number; width?: number; height?: number;
  garmentType?: string; aiDescription?: string; dominantColors?: Array<{ hex: string; name: string; percentage: number }>;
  aiTags?: string[]; isFavourite: boolean; isArchived: boolean; analysisStatus: string;
  createdAt: string;
}

interface AnalysisResult {
  id: string; type: string; result: Record<string, unknown>; createdAt: string;
}

interface MoodBoard {
  id: string; title: string; description?: string; theme?: string;
  keywords?: string[]; styleDirection?: string; thumbnailUrl?: string;
  createdAt: string; updatedAt: string;
}

interface VisionGeneration {
  id: string; prompt: string; imageUrl: string; createdAt: string;
}

const TABS = ["library", "analyse", "generate", "moodboards", "search"] as const;
type TabId = (typeof TABS)[number];

const TAB_ICONS: Record<TabId, React.ElementType> = {
  library: ImageIcon, analyse: Sparkles, generate: Wand2,
  moodboards: Layout, search: Search,
};
const TAB_LABELS: Record<TabId, string> = {
  library: "Images", analyse: "Analyse", generate: "Generate",
  moodboards: "Mood Boards", search: "Search",
};

export default function VisionLabPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const fetchUrl = (path: string) => fetch(`${API_BASE}${path}`, { headers });

  const [activeTab, setActiveTab] = useState<TabId>("library");
  const [selectedImage, setSelectedImage] = useState<VisionImage | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Generation
  const [genPrompt, setGenPrompt] = useState("");
  const [genResult, setGenResult] = useState<string | null>(null);

  // Analysis display
  const [activeAnalysis, setActiveAnalysis] = useState<string>("FULL");

  // Mood board
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [boardTitle, setBoardTitle] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VisionImage[]>([]);

  // Queries
  const { data: images = [], isLoading: imagesLoading } = useQuery({
    queryKey: ["vision", "images"],
    queryFn: () => fetchUrl("/api/designer/vision/images").then((r) => r.json()),
  });

  const { data: generations = [] } = useQuery({
    queryKey: ["vision", "generations"],
    queryFn: () => fetchUrl("/api/designer/vision/generations").then((r) => r.json()),
  });

  const { data: moodBoards = [] } = useQuery({
    queryKey: ["vision", "mood-boards"],
    queryFn: () => fetchUrl("/api/designer/vision/mood-boards").then((r) => r.json()),
  });

  const { data: selectedImageData } = useQuery({
    queryKey: ["vision", "image", selectedImage?.id],
    queryFn: () => fetchUrl(`/api/designer/vision/images/${selectedImage?.id}`).then((r) => r.json()),
    enabled: !!selectedImage,
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async (base64Data: string) => {
      const res = await fetchUrl("/api/designer/vision/images/upload", {
        method: "POST", headers, body: JSON.stringify({
          fileName: file?.name ?? "upload", mimeType: file?.type ?? "image/jpeg",
          fileSize: file?.size ?? 0, base64Data,
        }),
      });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vision"] }); setShowUploader(false); setFile(null); setPreview(null); toast({ description: "Image uploaded! Analysing..." }); },
    onError: () => { toast({ description: "Upload failed", variant: "destructive" }); },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchUrl("/api/designer/vision/generate", {
        method: "POST", headers, body: JSON.stringify({ prompt: genPrompt }),
      });
      return res.json();
    },
    onSuccess: (data) => { setGenResult(data.imageUrl); qc.invalidateQueries({ queryKey: ["vision", "generations"] }); },
    onError: () => { toast({ description: "Generation failed. Try again.", variant: "destructive" }); },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (id: string) => fetchUrl(`/api/designer/vision/images/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vision"] }); setSelectedImage(null); },
  });

  const favouriteMutation = useMutation({
    mutationFn: ({ id, isFavourite }: { id: string; isFavourite: boolean }) =>
      fetchUrl(`/api/designer/vision/images/${id}`, { method: "PATCH", headers, body: JSON.stringify({ isFavourite }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vision"] }),
  });

  const createBoardMutation = useMutation({
    mutationFn: () => fetchUrl("/api/designer/vision/mood-boards", {
      method: "POST", headers, body: JSON.stringify({ title: boardTitle }),
    }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vision", "mood-boards"] }); setShowCreateBoard(false); setBoardTitle(""); toast({ description: "Mood board created!" }); },
  });

  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast({ description: "File too large (max 10MB)", variant: "destructive" }); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleUpload = () => {
    if (!preview) return;
    const base64 = preview.split(",")[1];
    uploadMutation.mutate(base64);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const res = await fetchUrl(`/api/designer/vision/search?q=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();
    setSearchResults(data);
  };

  const handleAnalyse = async (imageId: string, type: string) => {
    toast({ description: `Running ${type} analysis...` });
    const res = await fetchUrl(`/api/designer/vision/analyse/${type}/${imageId}`, { method: "POST", headers });
    if (res.ok) {
      toast({ description: `${type} analysis complete!` });
      qc.invalidateQueries({ queryKey: ["vision", "image", imageId] });
    } else {
      toast({ description: `Analysis failed`, variant: "destructive" });
    }
  };

  // Image grid
  const ImageGrid = ({ items, onSelect }: { items: VisionImage[]; onSelect: (img: VisionImage) => void }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((img) => (
        <motion.div key={img.id} layoutId={img.id} whileHover={{ y: -2 }}
          className="group relative bg-card border border-border rounded-xl overflow-hidden cursor-pointer aspect-[3/4]"
          onClick={() => onSelect(img)}
        >
          {img.originalPath.startsWith("data:") ? (
            <img src={img.originalPath} alt={img.originalName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
            <p className="text-xs text-white truncate">{img.originalName}</p>
            {img.garmentType && <p className="text-[10px] text-white/60">{img.garmentType}</p>}
          </div>
          {img.isFavourite && (
            <Star className="absolute top-2 right-2 h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          )}
          {img.dominantColors && img.dominantColors.length > 0 && (
            <div className="absolute top-2 left-2 flex gap-0.5">
              {img.dominantColors.slice(0, 4).map((c, i) => (
                <div key={i} className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} title={c.name} />
              ))}
            </div>
          )}
          {img.analysisStatus === "PROCESSING" && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
          {img.analysisStatus === "FAILED" && (
            <div className="absolute bottom-2 left-2">
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Failed</Badge>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );

  // Analysis panel
  const analysisEntries = (selectedImageData?.analyses ?? []) as AnalysisResult[];
  const currentAnalysis = analysisEntries.find((a) => a.type === activeAnalysis);

  const renderAnalysisResult = (result: Record<string, unknown>) => {
    if (!result) return <p className="text-sm text-muted-foreground">No analysis data available.</p>;
    return (
      <div className="space-y-3">
        {Object.entries(result).map(([key, value]) => (
          <div key={key}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {key.replace(/([A-Z])/g, " $1").replace(/([a-z])([A-Z])/g, "$1 $2").trim()}
            </p>
            {Array.isArray(value) ? (
              <div className="flex flex-wrap gap-1.5">
                {value.map((item, i) => {
                  if (typeof item === "object" && item !== null) {
                    return (
                      <div key={i} className="bg-muted/30 rounded-lg p-2 text-xs w-full">
                        {Object.entries(item).map(([k, v]) => (
                          <p key={k}><span className="text-muted-foreground">{k}: </span>{String(v)}</p>
                        ))}
                      </div>
                    );
                  }
                  return <Badge key={i} variant="outline" className="text-xs">{String(item)}</Badge>;
                })}
              </div>
            ) : typeof value === "number" && value >= 1 && value <= 10 ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(value / 10) * 100}%` }} />
                </div>
                <span className="text-sm font-medium">{value}/10</span>
              </div>
            ) : (
              <p className="text-sm">{String(value)}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {/* Sidebar tabs */}
      <div className="flex flex-col w-16 border-r border-border bg-sidebar shrink-0 pt-2">
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab];
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn("flex flex-col items-center gap-1 py-3 px-2 text-[10px] transition-colors",
                activeTab === tab ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="flex-1 flex flex-col">
          {/* ── LIBRARY TAB ── */}
          <TabsContent value="library" className="flex-1 m-0 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-serif font-medium">Image Library</h1>
              <Button onClick={() => setShowUploader(true)} className="gap-2 bg-primary hover:bg-primary/80 rounded-lg">
                <Upload className="h-4 w-4" /> Upload
              </Button>
            </div>

            {/* Uploader */}
            <AnimatePresence>
              {showUploader && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
                  <div className="bg-card border border-border rounded-xl p-6">
                    {!preview ? (
                      <label className="flex flex-col items-center gap-3 py-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Drop an image or click to upload</p>
                        <p className="text-xs text-muted-foreground/50">PNG, JPG, JPEG, WEBP — max 10MB</p>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileSelect} className="hidden" />
                      </label>
                    ) : (
                      <div className="space-y-4">
                        <img src={preview} alt="Preview" className="max-h-64 rounded-lg mx-auto object-contain" />
                        <div className="flex justify-center gap-2">
                          <Button onClick={handleUpload} disabled={uploadMutation.isPending} className="bg-primary hover:bg-primary/80 rounded-lg">
                            {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            Upload &amp; Analyse
                          </Button>
                          <Button onClick={() => { setFile(null); setPreview(null); }} variant="outline" className="rounded-lg">Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {imagesLoading ? (
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="aspect-[3/4] bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (images as VisionImage[]).length === 0 ? (
              <div className="text-center py-20">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground/60">Your image library is empty</p>
                <p className="text-sm text-muted-foreground/40 mt-1">Upload fashion images for AI analysis</p>
                <Button onClick={() => setShowUploader(true)} className="mt-4 gap-2 bg-primary hover:bg-primary/80 rounded-lg">
                  <Upload className="h-4 w-4" /> Upload your first image
                </Button>
              </div>
            ) : (
              <ImageGrid items={images as VisionImage[]} onSelect={setSelectedImage} />
            )}
          </TabsContent>

          {/* ── ANALYSE TAB ── */}
          <TabsContent value="analyse" className="flex-1 m-0 overflow-y-auto">
            {selectedImage ? (
              <div className="p-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <img src={selectedImage.originalPath} alt={selectedImage.originalName} className="w-full rounded-xl border border-border" />
                    <div className="mt-3">
                      <p className="text-sm font-medium">{selectedImage.originalName}</p>
                      {selectedImage.garmentType && <Badge className="mt-1">{selectedImage.garmentType}</Badge>}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedImage.aiTags?.map((tag) => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {["FULL", "FABRIC", "COLOUR", "DECONSTRUCT", "IMPROVE", "TREND"].map((type) => (
                        <Button key={type} onClick={() => handleAnalyse(selectedImage.id, type.toLowerCase())}
                          variant="outline" size="sm" className="rounded-lg text-xs">
                          <Sparkles className="h-3 w-3 mr-1" /> {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      {analysisEntries.map((a) => (
                        <button key={a.id} onClick={() => setActiveAnalysis(a.type)}
                          className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            activeAnalysis === a.type ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
                          )}
                        >{a.type}</button>
                      ))}
                      {analysisEntries.length === 0 && <p className="text-sm text-muted-foreground">Click an analysis button above</p>}
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4 min-h-[200px]">
                      {currentAnalysis ? renderAnalysisResult(currentAnalysis.result) : <p className="text-sm text-muted-foreground">Select an analysis type to view results</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => favouriteMutation.mutate({ id: selectedImage.id, isFavourite: !selectedImage.isFavourite })}>
                        <Star className={cn("h-3 w-3 mr-1", selectedImage.isFavourite && "fill-amber-400 text-amber-400")} />
                        {selectedImage.isFavourite ? "Favourited" : "Favourite"}
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-lg text-xs text-red-400 hover:text-red-400" onClick={() => { if (confirm("Delete this image?")) deleteImageMutation.mutate(selectedImage.id); }}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Eye className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Select an image from the library to analyse</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── GENERATE TAB ── */}
          <TabsContent value="generate" className="flex-1 m-0 p-4 overflow-y-auto">
            <h1 className="text-2xl font-serif font-medium mb-6">AI Image Generation</h1>
            <div className="max-w-xl">
              <Textarea value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} placeholder="Describe the fashion design you want to generate..." className="min-h-[100px] mb-3" />
              <Button onClick={() => generateMutation.mutate()} disabled={!genPrompt.trim() || generateMutation.isPending} className="bg-primary hover:bg-primary/80 rounded-lg gap-2">
                {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {generateMutation.isPending ? "Generating..." : "Generate"}
              </Button>
            </div>

            {genResult && (
              <div className="mt-6 max-w-xl">
                {genResult.startsWith("data:image") ? (
                  <img src={genResult} alt="Generated" className="w-full rounded-xl border border-border" />
                ) : (
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm font-medium">Design Concept</p>
                    <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{genResult}</pre>
                  </div>
                )}
              </div>
            )}

            {/* Generation history */}
            {(generations as VisionGeneration[]).length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-serif font-medium mb-4">Generation History</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(generations as VisionGeneration[]).map((g) => (
                    <div key={g.id} className="group relative bg-card border border-border rounded-xl overflow-hidden aspect-square">
                      {g.imageUrl.startsWith("data:image") ? (
                        <img src={g.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted p-2">
                          <p className="text-[10px] text-muted-foreground text-center line-clamp-4">{g.prompt}</p>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60">
                        <p className="text-[10px] text-white truncate">{g.prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── MOOD BOARDS TAB ── */}
          <TabsContent value="moodboards" className="flex-1 m-0 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-serif font-medium">Mood Boards</h1>
              <Button onClick={() => setShowCreateBoard(true)} className="gap-2 bg-primary hover:bg-primary/80 rounded-lg">
                <Plus className="h-4 w-4" /> New Board
              </Button>
            </div>

            {showCreateBoard && (
              <div className="bg-card border border-border rounded-xl p-4 mb-6 flex gap-2">
                <Input value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} placeholder="Mood board name..." className="flex-1" />
                <Button onClick={() => createBoardMutation.mutate()} disabled={!boardTitle.trim()} className="bg-primary hover:bg-primary/80 rounded-lg">
                  <Plus className="h-4 w-4" /> Create
                </Button>
                <Button onClick={() => setShowCreateBoard(false)} variant="outline" className="rounded-lg">Cancel</Button>
              </div>
            )}

            {(moodBoards as MoodBoard[]).length === 0 ? (
              <div className="text-center py-20">
                <Layout className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground/60">No mood boards yet</p>
                <p className="text-sm text-muted-foreground/40 mt-1">Create a mood board to organize your design inspiration</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {(moodBoards as MoodBoard[]).map((board) => (
                  <motion.div key={board.id} whileHover={{ y: -2 }}
                    className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/30 transition-colors"
                  >
                    <h3 className="font-medium mb-1">{board.title}</h3>
                    {board.theme && <p className="text-xs text-muted-foreground">{board.theme}</p>}
                    {board.keywords && board.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {board.keywords.slice(0, 4).map((kw) => <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>)}
                      </div>
                    )}
                    {board.styleDirection && <p className="text-xs text-muted-foreground mt-2">{board.styleDirection}</p>}
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── SEARCH TAB ── */}
          <TabsContent value="search" className="flex-1 m-0 p-4 overflow-y-auto">
            <h1 className="text-2xl font-serif font-medium mb-4">Image Search</h1>
            <div className="flex gap-2 mb-6 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by colour, garment type, tags..." className="pl-10" />
              </div>
              <Button onClick={handleSearch} className="bg-primary hover:bg-primary/80 rounded-lg"><Search className="h-4 w-4" /></Button>
            </div>

            {searchResults.length > 0 && <ImageGrid items={searchResults} onSelect={setSelectedImage} />}
            {searchResults.length === 0 && searchQuery && (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No results found. Try different keywords.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
