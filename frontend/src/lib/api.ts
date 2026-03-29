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
