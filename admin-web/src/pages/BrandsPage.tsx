import { useEffect, useState } from "react";
import api from "../lib/api";
import { TableSkeleton } from "../components/TableSkeleton";
import { Plus, Pencil, Trash2, X, Globe } from "lucide-react";

interface Brand {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
}

const emptyBrand = { name: "", slug: "", logo_url: "", translations: {} as Record<string, { name: string }> };

interface Language {
  id: number;
  code: string;
  name: string;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState(emptyBrand);

  const fetchLanguages = () => api.get("/i18n/languages").then((r) => setLanguages(r.data));
  const fetchBrands = () =>
    api.get("/brands/").then((r) => setBrands(r.data)).finally(() => setLoading(false));

  useEffect(() => {
    fetchLanguages();
    fetchBrands();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        logo_url: form.logo_url || undefined,
      };
      if (Object.keys(form.translations || {}).length > 0) payload.translations = form.translations;
      await api.post("/brands/", payload);
      setForm(emptyBrand);
      setShowAdd(false);
      fetchBrands();
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
        slug: form.slug || slugify(form.name),
        logo_url: form.logo_url || undefined,
      };
      payload.translations = form.translations || {};
      await api.put(`/brands/${editing.id}`, payload);
      setEditing(null);
      setForm(emptyBrand);
      fetchBrands();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this brand?")) return;
    try {
      await api.delete(`/brands/${id}`);
      fetchBrands();
    } catch {
      alert("Failed to delete");
    }
  };

  const openEdit = async (b: Brand) => {
    setEditing(b);
    let translations: Record<string, { name: string }> = {};
    try {
      const r = await api.get<Record<string, { name: string }>>(`/brands/${b.id}/translations`);
      translations = r.data || {};
    } catch {
      // ignore
    }
    setForm({ name: b.name, slug: b.slug, logo_url: b.logo_url ?? "", translations });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-display text-3xl font-bold text-text-primary">Brands</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-5 w-5" /> Add Brand
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 bg-white rounded-2xl border border-sand-divider p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-lg font-semibold text-text-primary">Add Brand</h2>
            <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
              className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary placeholder:text-text-muted/60 focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
            <input
              placeholder="Slug"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary placeholder:text-text-muted/60 focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <input
              placeholder="Logo URL"
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              className="md:col-span-2 px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary placeholder:text-text-muted/60 focus:ring-2 focus:ring-primary focus:border-primary"
            />
            {languages.filter((l) => l.code !== "en").length > 0 && (
              <details className="md:col-span-2 border border-sand-divider rounded-xl overflow-hidden">
                <summary className="flex items-center gap-2 px-4 py-3 bg-background-light cursor-pointer hover:bg-sand-divider/30 font-medium text-text-muted">
                  <Globe className="h-4 w-4" /> Translations (for storefront)
                </summary>
                <div className="p-4 space-y-4 border-t border-sand-divider">
                  <p className="text-sm text-text-muted">Add brand name in other languages. Base name above is English.</p>
                  {languages.filter((l) => l.code !== "en").map((lang) => (
                    <div key={lang.id} className="border border-sand-divider rounded-xl p-4 bg-background-light/50">
                      <h4 className="text-sm font-medium text-text-muted mb-3">{lang.name} ({lang.code})</h4>
                      <input
                        placeholder={`Name (${lang.code})`}
                        value={form.translations?.[lang.code]?.name ?? ""}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          translations: { ...prev.translations, [lang.code]: { name: e.target.value } },
                        }))}
                        className="w-full px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                      />
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
          <div className="bg-white rounded-2xl border border-sand-divider p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-lg font-semibold text-text-primary">Edit Brand</h2>
              <button onClick={() => setEditing(null)} className="text-text-muted hover:text-text-primary"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleUpdate} className="grid gap-4">
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary" required />
              <input placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary" />
              <input placeholder="Logo URL" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary" />
              {languages.filter((l) => l.code !== "en").length > 0 && (
                <details className="border border-sand-divider rounded-xl overflow-hidden">
                  <summary className="flex items-center gap-2 px-4 py-3 bg-background-light cursor-pointer hover:bg-sand-divider/30 font-medium text-text-muted">
                    <Globe className="h-4 w-4" /> Translations (for storefront)
                  </summary>
                  <div className="p-4 space-y-4 border-t border-sand-divider">
                    <p className="text-sm text-text-muted">Add brand name in other languages. Base name above is English.</p>
                    {languages.filter((l) => l.code !== "en").map((lang) => (
                      <div key={lang.id} className="border border-sand-divider rounded-xl p-4 bg-background-light/50">
                        <h4 className="text-sm font-medium text-text-muted mb-3">{lang.name} ({lang.code})</h4>
                        <input
                          placeholder={`Name (${lang.code})`}
                          value={form.translations?.[lang.code]?.name ?? ""}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            translations: { ...prev.translations, [lang.code]: { name: e.target.value } },
                          }))}
                          className="w-full px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    ))}
                  </div>
                </details>
              )}
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90">Save</button>
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-sand-divider rounded-xl text-text-primary hover:bg-sand-divider/30">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-sand-divider overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-light border-b border-sand-divider">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Logo</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Name</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Slug</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={4} />
              ) : (
                brands.map((b) => (
                  <tr key={b.id} className="border-b border-sand-divider last:border-0">
                    <td className="py-4 px-4">
                      <div className="h-10 w-10 rounded-xl bg-sand-divider/40 overflow-hidden">
                        {b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full object-contain" loading="lazy" decoding="async" /> : <div className="h-full w-full flex items-center justify-center text-xs text-text-muted">—</div>}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-text-primary">{b.name}</td>
                    <td className="py-4 px-4 text-text-muted">{b.slug}</td>
                    <td className="py-4 px-4 flex gap-2">
                      <button onClick={() => openEdit(b)} className="p-2 border border-sand-divider rounded-xl hover:bg-sand-divider/30 text-text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(b.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && brands.length === 0 && (
          <div className="py-10 text-center text-text-muted">No brands yet. Add one to get started.</div>
        )}
      </div>
    </div>
  );
}
