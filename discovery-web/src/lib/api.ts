const baseURL = import.meta.env.VITE_DISCOVERY_API_URL || "/api";

export interface DiscoveredProduct {
  id: number;
  strategy_id: string;
  brand: string | null;
  title: string;
  image_url: string | null;
  source_url: string;
  price: number | null;
  currency: string | null;
  delivers_to_uae: boolean | null;
  discovered_at: string;
  run_id: string | null;
}

export interface Strategy {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
}

export interface RunResponse {
  run_id: string;
  count: number;
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = path.startsWith("http") ? path : `${baseURL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchProducts(params: {
  strategy_id?: string;
  delivers_to_uae?: boolean;
  limit?: number;
  offset?: number;
}): Promise<DiscoveredProduct[]> {
  const sp = new URLSearchParams();
  if (params.strategy_id != null) sp.set("strategy_id", params.strategy_id);
  if (params.delivers_to_uae != null)
    sp.set("delivers_to_uae", String(params.delivers_to_uae));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  const q = sp.toString();
  return request<DiscoveredProduct[]>(`/v1/products${q ? `?${q}` : ""}`);
}

export async function fetchStrategies(): Promise<Strategy[]> {
  return request<Strategy[]>("/v1/strategies");
}

export async function triggerRun(strategyId: string): Promise<RunResponse> {
  return request<RunResponse>("/v1/runs", {
    method: "POST",
    body: JSON.stringify({ strategy_id: strategyId }),
  });
}
