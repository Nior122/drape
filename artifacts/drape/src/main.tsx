import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

// ─── API base URL ────────────────────────────────────────────────────────────
// In production (Cloudflare Pages → Render API), set VITE_API_BASE_URL to
// your Render service URL, e.g. https://drape-api.onrender.com
// In development the Vite proxy handles /api → localhost:8080, so no base URL needed.
const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBase) {
  setBaseUrl(apiBase);
}

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
