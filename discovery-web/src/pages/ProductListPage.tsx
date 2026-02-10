import { useEffect, useState } from "react";
import {
  fetchProducts,
  fetchStrategies,
  triggerRun,
  type DiscoveredProduct,
  type Strategy,
} from "../lib/api";

export function ProductListPage() {
  const [products, setProducts] = useState<DiscoveredProduct[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [lastRun, setLastRun] = useState<{ run_id: string; count: number } | null>(null);
  const [filterStrategy, setFilterStrategy] = useState<string>("");
  const [filterUae, setFilterUae] = useState<boolean | "">("");
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    setError(null);
    try {
      const data = await fetchProducts({
        strategy_id: filterStrategy || undefined,
        delivers_to_uae: filterUae === "" ? undefined : filterUae,
        limit: 100,
        offset: 0,
      });
      setProducts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadStrategies = async () => {
    try {
      const data = await fetchStrategies();
      setStrategies(data);
    } catch {
      setStrategies([]);
    }
  };

  useEffect(() => {
    loadStrategies();
  }, []);

  useEffect(() => {
    setLoading(true);
    loadProducts();
  }, [filterStrategy, filterUae]);

  const onRun = async (strategyId: string) => {
    setRunLoading(true);
    setError(null);
    try {
      const result = await triggerRun(strategyId);
      setLastRun({ run_id: result.run_id, count: result.count });
      await loadProducts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Product discovery</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        View and filter discovered products. Trigger a run to fetch new items.
      </p>

      {/* Run / strategies */}
      <section
        style={{
          marginBottom: 24,
          padding: 16,
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #eee",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Run</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <select
            id="run-strategy"
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
          >
            <option value="all">All</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={runLoading}
            onClick={() => {
              const sel = document.getElementById("run-strategy") as HTMLSelectElement;
              onRun(sel?.value || "all");
            }}
            style={{
              padding: "8px 16px",
              background: "#232f3e",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: runLoading ? "not-allowed" : "pointer",
            }}
          >
            {runLoading ? "Running…" : "Run"}
          </button>
          {lastRun && (
            <span style={{ color: "#666", fontSize: 14 }}>
              Last run: {lastRun.count} products (run_id: {lastRun.run_id.slice(0, 8)}…)
            </span>
          )}
        </div>
        <div style={{ marginTop: 12, fontSize: 14, color: "#666" }}>
          Strategies:{" "}
          {strategies.map((s) => (
            <span key={s.id} style={{ marginRight: 12 }}>
              {s.name} ({s.id})
            </span>
          ))}
        </div>
      </section>

      {/* Filters */}
      <section
        style={{
          marginBottom: 16,
          padding: 16,
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #eee",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Filters</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <label>
            Strategy:{" "}
            <select
              value={filterStrategy}
              onChange={(e) => setFilterStrategy(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" }}
            >
              <option value="">All</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Delivers to UAE:{" "}
            <select
              value={filterUae === "" ? "" : String(filterUae)}
              onChange={(e) =>
                setFilterUae(e.target.value === "" ? "" : e.target.value === "true")
              }
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" }}
            >
              <option value="">Any</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>
      </section>

      {error && (
        <div
          style={{
            padding: 12,
            marginBottom: 16,
            background: "#fee",
            borderRadius: 8,
            color: "#c00",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading products…</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {products.map((p) => (
            <div
              key={p.id}
              style={{
                background: "#fff",
                borderRadius: 8,
                border: "1px solid #eee",
                overflow: "hidden",
              }}
            >
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt=""
                  style={{ width: "100%", height: 160, objectFit: "cover" }}
                />
              )}
              <div style={{ padding: 12 }}>
                {p.brand && (
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{p.brand}</div>
                )}
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{p.title}</div>
                <div style={{ marginBottom: 8 }}>
                  {p.price != null && (
                    <span>
                      {p.price} {p.currency ?? ""}
                    </span>
                  )}
                  {p.delivers_to_uae === true && (
                    <span
                      style={{
                        marginLeft: 8,
                        padding: "2px 6px",
                        background: "#232f3e",
                        color: "#fff",
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      Delivers to UAE
                    </span>
                  )}
                </div>
                <a
                  href={p.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 14, color: "#ff9900" }}
                >
                  View source →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && products.length === 0 && (
        <p style={{ color: "#666" }}>No products found. Trigger a run to discover products.</p>
      )}
    </div>
  );
}
