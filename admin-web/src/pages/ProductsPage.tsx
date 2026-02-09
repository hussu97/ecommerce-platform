import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Plus, Pencil, Trash2, X, Globe, Upload, Download } from "lucide-react";

interface Taxonomy {
  id: number;
  name: string;
  section?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

interface TaxonomyAttribute {
  id: number;
  taxonomy_id: number;
  name: string;
  type_: string;
  sort_order: number;
  is_active?: boolean;
  options: { id: number; value: string; sort_order: number; is_active?: boolean }[];
}

interface Brand {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  category_id?: number | null;
  brand_id?: number | null;
  category_path?: string | null;
  brand_name?: string | null;
  attributes?: { attribute_name: string; value: string }[];
  is_active: boolean;
}

const emptyProduct = {
  name: "",
  description: "",
  price: 0,
  stock_quantity: 0,
  image_url: "",
  category_id: null as number | null,
  brand_id: null as number | null,
  attribute_option_ids: [] as number[],
  is_active: true,
  translations: {} as Record<string, { name: string; description: string }>,
};

interface Language {
  id: number;
  code: string;
  name: string;
}

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [taxonomyAttributes, setTaxonomyAttributes] = useState<TaxonomyAttribute[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkTaxonomyId, setBulkTaxonomyId] = useState<number | null>(null);
  const [bulkUploadStatus, setBulkUploadStatus] = useState<string | null>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);

  const fetchTaxonomies = () => api.get("/taxonomies/").then((r) => setTaxonomies(r.data));
  const fetchBrands = () => api.get("/brands/").then((r) => setBrands(r.data));
  const fetchLanguages = () => api.get("/i18n/languages").then((r) => setLanguages(r.data));
  const fetchProducts = () =>
    api.get("/products/").then((r) => setProducts(r.data)).finally(() => setLoading(false));

  const fetchAttributesForCategory = (categoryId: number | null) => {
    if (!categoryId) {
      setTaxonomyAttributes([]);
      return;
    }
    api.get(`/taxonomy-attributes/by-taxonomy/${categoryId}`).then((r) => setTaxonomyAttributes(r.data));
  };

  useEffect(() => {
    fetchTaxonomies();
    fetchBrands();
    fetchLanguages();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchAttributesForCategory(form.category_id);
  }, [form.category_id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        price: form.price,
        stock_quantity: form.stock_quantity,
        image_url: form.image_url || undefined,
        category_id: form.category_id || undefined,
        brand_id: form.brand_id || undefined,
        is_active: form.is_active,
        attribute_option_ids: form.attribute_option_ids,
      };
      if (Object.keys(form.translations || {}).length > 0) {
        payload.translations = form.translations;
      }
      await api.post("/products/", payload);
      setForm(emptyProduct);
      setShowAdd(false);
      fetchProducts();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        price: form.price,
        stock_quantity: form.stock_quantity,
        image_url: form.image_url || undefined,
        category_id: form.category_id ?? undefined,
        brand_id: form.brand_id ?? undefined,
        is_active: form.is_active,
        attribute_option_ids: form.attribute_option_ids,
      };
      payload.translations = form.translations || {};
      await api.put(`/products/${editing.id}`, payload);
      setEditing(null);
      setForm(emptyProduct);
      fetchProducts();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch {
      alert("Failed to delete");
    }
  };

  const openEdit = async (p: Product) => {
    setEditing(p);
    fetchAttributesForCategory(p.category_id ?? null);
    let translations: Record<string, { name: string; description: string }> = {};
    try {
      const r = await api.get<Record<string, { name: string; description: string }>>(`/products/${p.id}/translations`);
      translations = r.data || {};
    } catch {
      // ignore
    }
    setForm({
      ...emptyProduct,
      name: p.name,
      description: p.description ?? "",
      price: p.price,
      stock_quantity: p.stock_quantity,
      image_url: p.image_url ?? "",
      category_id: p.category_id ?? null,
      brand_id: p.brand_id ?? null,
      is_active: p.is_active,
      attribute_option_ids: [],
      translations,
    });
  };

  useEffect(() => {
    if (editing && taxonomyAttributes.length > 0 && editing.attributes && editing.attributes.length > 0) {
      const ids = editing.attributes
        .map((pa) => {
          const attr = taxonomyAttributes.find((a) => a.name === pa.attribute_name);
          const opt = attr?.options.find((o) => o.value === pa.value);
          return opt?.id;
        })
        .filter((id): id is number => id != null);
      setForm((prev) => ({ ...prev, attribute_option_ids: ids }));
    }
  }, [editing?.id, taxonomyAttributes]);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-display text-3xl font-bold text-text-primary">Products</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/products/bulk"
            className="flex items-center gap-2 px-4 py-2.5 border border-sand-divider rounded-xl font-medium text-text-primary hover:bg-sand-divider/30 transition-colors"
          >
            <Upload className="h-5 w-5" /> Bulk uploads
          </Link>
          <button
            onClick={() => { setShowBulk(false); setShowAdd(!showAdd); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-5 w-5" /> Add Product
          </button>
          <button
            onClick={() => { setShowAdd(false); setShowBulk(!showBulk); setBulkUploadStatus(null); }}
            className="flex items-center gap-2 px-4 py-2.5 border border-sand-divider rounded-xl font-medium text-text-primary hover:bg-sand-divider/30 transition-colors"
          >
            <Upload className="h-5 w-5" /> Bulk upload
          </button>
        </div>
      </div>

      {showBulk && (
        <div className="mb-6 bg-white rounded-2xl border border-sand-divider p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-lg font-semibold text-text-primary">Bulk Upload Products</h2>
            <button onClick={() => setShowBulk(false)} className="text-text-muted hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Taxonomy (category)</label>
              <select
                value={bulkTaxonomyId ?? ""}
                onChange={(e) => setBulkTaxonomyId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">— Select taxonomy —</option>
                {taxonomies.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                disabled={!bulkTaxonomyId}
                onClick={async () => {
                  if (!bulkTaxonomyId) return;
                  try {
                    const r = await api.get(`/products/bulk/template/${bulkTaxonomyId}?format=xlsx`, { responseType: "blob" });
                    const blob = new Blob([r.data], { type: r.headers["content-type"] });
                    const u = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = u;
                    a.download = `bulk_product_template_${bulkTaxonomyId}.xlsx`;
                    a.click();
                    URL.revokeObjectURL(u);
                  } catch {
                    alert("Download failed");
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 border border-sand-divider rounded-xl font-medium text-text-primary hover:bg-sand-divider/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-5 w-5" /> Download template
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-muted mb-1">Upload file (xlsx, csv, tsv)</label>
              <input
                ref={bulkFileRef}
                type="file"
                accept=".xlsx,.csv,.tsv"
                className="block w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary file:text-white file:font-medium hover:file:opacity-90"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !bulkTaxonomyId) return;
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    fd.append("taxonomy_id", String(bulkTaxonomyId));
                    const r = await api.post("/products/bulk/upload", fd);
                    setBulkUploadStatus(`Upload successful. ${r.data.message} View status: `);
                  } catch (err: unknown) {
                    alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Upload failed");
                  }
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          {bulkUploadStatus && (
            <p className="mt-4 text-sm text-green-700">
              {bulkUploadStatus}
              <Link to="/products/bulk" className="font-medium underline">Bulk uploads</Link>
            </p>
          )}
        </div>
      )}

      {showAdd && (
        <div className="mb-6 bg-white rounded-2xl border border-sand-divider p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-lg font-semibold text-text-primary">Add Product</h2>
            <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary placeholder:text-text-muted/60 focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Price"
              value={form.price || ""}
              onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
            <input
              type="number"
              placeholder="Stock"
              value={form.stock_quantity || ""}
              onChange={(e) => setForm({ ...form, stock_quantity: parseInt(e.target.value, 10) || 0 })}
              className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <select
              value={form.category_id ?? ""}
              onChange={(e) => setForm({ ...form, category_id: e.target.value ? parseInt(e.target.value, 10) : null, attribute_option_ids: [] })}
              className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">— No category —</option>
              {taxonomies.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.is_active === false ? " (Inactive)" : ""}</option>
              ))}
            </select>
            <select
              value={form.brand_id ?? ""}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value ? parseInt(e.target.value, 10) : null })}
              className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">— No brand —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {taxonomyAttributes.map((attr) => (
              <select
                key={attr.id}
                value={form.attribute_option_ids.find((id) => attr.options.some((o) => o.id === id)) ?? ""}
                onChange={(e) => {
                  const optId = e.target.value ? parseInt(e.target.value, 10) : null;
                  const optIdsForAttr = attr.options.map((o) => o.id);
                  setForm((prev) => ({
                    ...prev,
                    attribute_option_ids: optId
                      ? [...prev.attribute_option_ids.filter((id) => !optIdsForAttr.includes(id)), optId]
                      : prev.attribute_option_ids.filter((id) => !optIdsForAttr.includes(id)),
                  }));
                }}
                className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">— {attr.name}{attr.is_active === false ? " (Inactive)" : ""} —</option>
                {(attr.options || []).map((o) => (
                  <option key={o.id} value={o.id}>{o.value}{o.is_active === false ? " (Inactive)" : ""}</option>
                ))}
              </select>
            ))}
            <input
              placeholder="Image URL"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="md:col-span-2 px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary placeholder:text-text-muted/60 focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="md:col-span-2 px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary placeholder:text-text-muted/60 min-h-[80px] focus:ring-2 focus:ring-primary focus:border-primary"
            />
            {languages.filter((l) => l.code !== "en").length > 0 && (
              <details className="md:col-span-2 border border-sand-divider rounded-xl overflow-hidden">
                <summary className="flex items-center gap-2 px-4 py-3 bg-background-light cursor-pointer hover:bg-sand-divider/30 font-medium text-text-muted">
                  <Globe className="h-4 w-4" /> Translations (for storefront)
                </summary>
                <div className="p-4 space-y-4 border-t">
                  <p className="text-sm text-text-muted">Add name and description in other languages. Base fields above are English.</p>
                  {languages.filter((l) => l.code !== "en").map((lang) => (
                    <div key={lang.id} className="border border-sand-divider rounded-xl p-4 bg-background-light/50">
                      <h4 className="text-sm font-medium text-text-muted mb-3">{lang.name} ({lang.code})</h4>
                      <div className="space-y-3">
                        <input
                          placeholder={`Name (${lang.code})`}
                          value={form.translations?.[lang.code]?.name ?? ""}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            translations: { ...prev.translations, [lang.code]: { ...prev.translations?.[lang.code], name: e.target.value, description: prev.translations?.[lang.code]?.description ?? "" } },
                          }))}
                          className="w-full px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary placeholder:text-text-muted/60 focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                        <textarea
                          placeholder={`Description (${lang.code})`}
                          value={form.translations?.[lang.code]?.description ?? ""}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            translations: { ...prev.translations, [lang.code]: { name: prev.translations?.[lang.code]?.name ?? "", description: e.target.value } },
                          }))}
                          className="w-full px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary placeholder:text-text-muted/60 min-h-[60px] focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90">Add</button>
          </form>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-sand-divider p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-lg font-semibold text-text-primary">Edit Product</h2>
              <button onClick={() => setEditing(null)} className="text-text-muted hover:text-text-primary"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary" required />
              <input type="number" step="0.01" placeholder="Price" value={form.price || ""} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary" required />
              <input type="number" placeholder="Stock" value={form.stock_quantity || ""} onChange={(e) => setForm({ ...form, stock_quantity: parseInt(e.target.value, 10) || 0 })} className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary" />
              <select value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value ? parseInt(e.target.value, 10) : null, attribute_option_ids: [] })} className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary">
                <option value="">— No category —</option>
                {taxonomies.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_active === false ? " (Inactive)" : ""}</option>)}
              </select>
              <select value={form.brand_id ?? ""} onChange={(e) => setForm({ ...form, brand_id: e.target.value ? parseInt(e.target.value, 10) : null })} className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary">
                <option value="">— No brand —</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {taxonomyAttributes.map((attr) => (
                <select
                  key={attr.id}
                  value={form.attribute_option_ids.find((id) => attr.options.some((o) => o.id === id)) ?? ""}
                  onChange={(e) => {
                    const optId = e.target.value ? parseInt(e.target.value, 10) : null;
                    const optIdsForAttr = attr.options.map((o) => o.id);
                    setForm((prev) => ({
                      ...prev,
                      attribute_option_ids: optId
                        ? [...prev.attribute_option_ids.filter((id) => !optIdsForAttr.includes(id)), optId]
                        : prev.attribute_option_ids.filter((id) => !optIdsForAttr.includes(id)),
                    }));
                  }}
                  className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">— {attr.name}{attr.is_active === false ? " (Inactive)" : ""} —</option>
                  {(attr.options || []).map((o) => (
                    <option key={o.id} value={o.id}>{o.value}{o.is_active === false ? " (Inactive)" : ""}</option>
                  ))}
                </select>
              ))}
              <input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="md:col-span-2 px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary" />
              <label className="md:col-span-2 flex items-center gap-2 text-text-primary">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-sand-divider text-primary focus:ring-primary" />
                Active
              </label>
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="md:col-span-2 px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary min-h-[80px] focus:ring-2 focus:ring-primary focus:border-primary" />
              {languages.filter((l) => l.code !== "en").length > 0 && (
                <details className="md:col-span-2 border border-sand-divider rounded-xl overflow-hidden">
                  <summary className="flex items-center gap-2 px-4 py-3 bg-background-light cursor-pointer hover:bg-sand-divider/30 font-medium text-text-muted">
                    <Globe className="h-4 w-4" /> Translations (for storefront)
                  </summary>
                  <div className="p-4 space-y-4 border-t border-sand-divider">
                    <p className="text-sm text-text-muted">Add name and description in other languages. Base fields above are English.</p>
                    {languages.filter((l) => l.code !== "en").map((lang) => (
                      <div key={lang.id} className="border border-sand-divider rounded-xl p-4 bg-background-light/50">
                        <h4 className="text-sm font-medium text-text-muted mb-3">{lang.name} ({lang.code})</h4>
                        <div className="space-y-3">
                          <input
                            placeholder={`Name (${lang.code})`}
                            value={form.translations?.[lang.code]?.name ?? ""}
                            onChange={(e) => setForm((prev) => ({
                              ...prev,
                              translations: { ...prev.translations, [lang.code]: { ...prev.translations?.[lang.code], name: e.target.value, description: prev.translations?.[lang.code]?.description ?? "" } },
                            }))}
                            className="w-full px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                          <textarea
                            placeholder={`Description (${lang.code})`}
                            value={form.translations?.[lang.code]?.description ?? ""}
                            onChange={(e) => setForm((prev) => ({
                              ...prev,
                              translations: { ...prev.translations, [lang.code]: { name: prev.translations?.[lang.code]?.name ?? "", description: e.target.value } },
                            }))}
                            className="w-full px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary min-h-[60px] focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90">Save</button>
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-sand-divider rounded-xl text-text-primary hover:bg-sand-divider/30">Cancel</button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-sand-divider overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-light border-b border-sand-divider">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Image</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Name</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Price</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Stock</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Category</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Brand</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Status</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center text-text-muted">Loading...</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-sand-divider last:border-0">
                    <td className="py-4 px-4">
                      <div className="h-12 w-12 rounded-xl bg-sand-divider/40 overflow-hidden">
                        {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-xs text-text-muted">—</div>}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-text-primary">{p.name}</td>
                    <td className="py-4 px-4 text-text-primary">AED {p.price.toFixed(2)}</td>
                    <td className="py-4 px-4 text-text-muted">{p.stock_quantity}</td>
                    <td className="py-4 px-4 text-text-muted truncate max-w-[150px]" title={p.category_path ?? undefined}>{p.category_path || "—"}</td>
                    <td className="py-4 px-4 text-text-muted">{p.brand_name || "—"}</td>
                    <td className="py-4 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.is_active ? "bg-green-100 text-green-800" : "bg-sand-divider/50 text-text-muted"}`}>{p.is_active ? "Active" : "Inactive"}</span></td>
                    <td className="py-4 px-4 flex gap-2">
                      <button onClick={() => openEdit(p)} className="p-2 border border-sand-divider rounded-xl hover:bg-sand-divider/30 text-text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(p.id)} disabled={!p.is_active} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && products.length === 0 && (
          <div className="py-10 text-center text-text-muted">No products yet. Add one to get started.</div>
        )}
      </div>
    </div>
  );
}
