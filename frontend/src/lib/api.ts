const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface SearchResult {
  id: number;
  command_normalized: string;
  description: string | null;
  section: string;
  category: string | null;
  tags: string[];
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

export interface DocEntry {
  id: number;
  command_normalized: string;
  description: string | null;
  section: string;
  category: string | null;
  tags: string[];
  synonyms: string[];
  is_sensitive: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total_commands: number;
  total_docs: number;
  total_hosts: number;
  by_section: Record<string, number>;
  by_category: Record<string, number>;
  recent_commands: number;
}

export async function search(query: string): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function getDocumentation(
  section?: string
): Promise<DocEntry[]> {
  const path = section
    ? `${API_BASE}/documentation/${section}`
    : `${API_BASE}/documentation`;
  const res = await fetch(path);
  if (!res.ok) throw new Error("Failed to load documentation");
  return res.json();
}

export async function getDocEntry(id: number): Promise<DocEntry> {
  const res = await fetch(`${API_BASE}/documentation/entry/${id}`);
  if (!res.ok) throw new Error("Entry not found");
  return res.json();
}

export interface DocEntryUpdate {
  description?: string;
  section?: string;
  category?: string;
  tags?: string[];
  synonyms?: string[];
  is_sensitive?: boolean;
}

export async function updateDocEntry(id: number, payload: DocEntryUpdate): Promise<DocEntry> {
  const res = await fetch(`${API_BASE}/documentation/entry/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update entry");
  return res.json();
}

export interface TldrExample {
  description: string;
  command: string;
}

export interface TldrData {
  found: boolean;
  summary: string;
  examples: TldrExample[];
  platform?: string;
}

export async function getTldrExamples(command: string): Promise<TldrData> {
  const base = command.trim().split(/\s+/)[0];
  const res = await fetch(`${API_BASE}/tldr/examples/${encodeURIComponent(base)}`);
  if (!res.ok) return { found: false, summary: "", examples: [] };
  return res.json();
}

export async function importFromTldr(command: string): Promise<{ status: string }> {
  const base = command.trim().split(/\s+/)[0];
  const res = await fetch(`${API_BASE}/tldr/import/${encodeURIComponent(base)}`, { method: "POST" });
  if (!res.ok) throw new Error("Import failed");
  return res.json();
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

export interface ScriptPayload {
  title: string;
  script: string;
  description: string;
  tags: string[];
  section: string;
}

export async function addScript(payload: ScriptPayload): Promise<DocEntry> {
  const res = await fetch(`${API_BASE}/scripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to add script");
  return res.json();
}

// ─── Wiki ─────────────────────────────────────────────────────────────────

export interface WikiDoc {
  id: number;
  title: string;
  content: string;  // TipTap JSON stringified
  cover_color: string;
  tags: string[];
  section: string;
  created_at: string;
  updated_at: string;
}

export interface WikiDocPayload {
  title: string;
  content?: string;
  cover_color?: string;
  tags?: string[];
  section?: string;
}

export async function listWikiDocs(): Promise<WikiDoc[]> {
  const res = await fetch(`${API_BASE}/wiki`);
  if (!res.ok) throw new Error("Failed to load wiki");
  return res.json();
}

export async function getWikiDoc(id: number): Promise<WikiDoc> {
  const res = await fetch(`${API_BASE}/wiki/${id}`);
  if (!res.ok) throw new Error("Wiki document not found");
  return res.json();
}

export async function createWikiDoc(payload: WikiDocPayload): Promise<WikiDoc> {
  const res = await fetch(`${API_BASE}/wiki`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create wiki document");
  return res.json();
}

export async function updateWikiDoc(id: number, payload: Partial<WikiDocPayload>): Promise<WikiDoc> {
  const res = await fetch(`${API_BASE}/wiki/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update wiki document");
  return res.json();
}

export async function deleteWikiDoc(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/wiki/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete wiki document");
}

// ─── Veille CVE ──────────────────────────────────────────────────────────────

export type CveSeverity = "critical" | "high" | "medium" | "low" | "unknown";
export type CveSource   = "cert-fr" | "nvd";

export interface CveItem {
  id:          string;
  title:       string;
  description: string;
  link:        string;
  published:   string;
  source:      CveSource;
  type:        string;
  type_label:  string;
  severity:    CveSeverity;
  cvss_score:  number | null;
  lang:        string;
}

export interface CveFeed {
  items:          CveItem[];
  total:          number;
  cert_fr_count:  number;
  nvd_count:      number;
  refreshed_at:   string;
}

export async function getCveFeed(days = 7, keywords = ""): Promise<CveFeed> {
  const p = new URLSearchParams({ days: String(days) });
  if (keywords) p.set("keywords", keywords);
  const res = await fetch(`${API_BASE}/cve/feed?${p}`);
  if (!res.ok) throw new Error("Failed to load CVE feed");
  return res.json();
}

export async function searchCves(
  q: string,
  severity = "",
  source = ""
): Promise<{ items: CveItem[]; total: number }> {
  const p = new URLSearchParams({ q });
  if (severity) p.set("severity", severity);
  if (source)   p.set("source", source);
  const res = await fetch(`${API_BASE}/cve/search?${p}`);
  if (!res.ok) throw new Error("CVE search failed");
  return res.json();
}

export async function refreshCveCache(): Promise<{ status: string; cert_fr: number; nvd: number; total: number }> {
  const res = await fetch(`${API_BASE}/cve/refresh`, { method: "POST" });
  if (!res.ok) throw new Error("CVE refresh failed");
  return res.json();
}
