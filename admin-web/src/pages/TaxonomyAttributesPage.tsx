import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, Pencil, Trash2, X, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface Taxonomy {
  id: number;
  name: string;
  slug: string | null;
  section: string | null;
  sort_order: number;
  is_active: boolean;
}

interface TaxonomyAttributeOption {
  id: number;
  value: string;
  sort_order: number;
  is_active: boolean;
}

interface TaxonomyAttribute {
  id: number;
  taxonomy_id: number;
  name: string;
  type_: string;
  sort_order: number;
  is_active: boolean;
  options: TaxonomyAttributeOption[];
}

export function TaxonomyAttributesPage() {
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [selectedTaxonomyId, setSelectedTaxonomyId] = useState<number | null>(null);
  const [attributes, setAttributes] = useState<TaxonomyAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAttr, setShowAddAttr] = useState(false);
  const [editingAttr, setEditingAttr] = useState<TaxonomyAttribute | null>(null);
  const [editingOpt, setEditingOpt] = useState<{ attr: TaxonomyAttribute; opt: TaxonomyAttributeOption } | null>(null);
  const [expandedAttrs, setExpandedAttrs] = useState<Set<number>>(new Set());
  const [attrForm, setAttrForm] = useState({ name: "", sort_order: 0, initialOptions: "" });
  const [optForm, setOptForm] = useState({ value: "" });
  const [addOptForAttr, setAddOptForAttr] = useState<number | null>(null);
  const [newOptValue, setNewOptValue] = useState("");

  const fetchTaxonomies = () =>
    api.get("/taxonomies/").then((r) => setTaxonomies(r.data as Taxonomy[]));

  const fetchAttributes = () => {
    if (!selectedTaxonomyId) {
      setAttributes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(`/taxonomy-attributes/by-taxonomy/${selectedTaxonomyId}`)
      .then((r) => setAttributes(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTaxonomies();
  }, []);

  useEffect(() => {
    fetchAttributes();
  }, [selectedTaxonomyId]);

  const handleAddAttr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaxonomyId) return;
    try {
      const payload: Record<string, unknown> = {
        taxonomy_id: selectedTaxonomyId,
        name: attrForm.name,
        sort_order: attrForm.sort_order,
      };
      const opts = attrForm.initialOptions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (opts.length > 0) payload.options = opts.map((v) => ({ value: v }));
      await api.post("/taxonomy-attributes/", payload);
      setAttrForm({ name: "", sort_order: 0, initialOptions: "" });
      setShowAddAttr(false);
      fetchAttributes();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed");
    }
  };

  const handleUpdateAttr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttr) return;
    try {
      await api.put(`/taxonomy-attributes/${editingAttr.id}`, {
        name: attrForm.name,
        sort_order: attrForm.sort_order,
      });
      setEditingAttr(null);
      setAttrForm({ name: "", sort_order: 0, initialOptions: "" });
      fetchAttributes();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed");
    }
  };

  const handleDeactivateAttr = async (id: number) => {
    if (!confirm("Deactivate this attribute?")) return;
    try {
      await api.delete(`/taxonomy-attributes/${id}`);
      fetchAttributes();
    } catch {
      alert("Failed to deactivate");
    }
  };

  const handleActivateAttr = async (id: number) => {
    try {
      await api.patch(`/taxonomy-attributes/${id}/activate`);
      fetchAttributes();
    } catch {
      alert("Failed to activate");
    }
  };

  const handleAddOpt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addOptForAttr || !newOptValue.trim()) return;
    try {
      await api.post(`/taxonomy-attributes/${addOptForAttr}/options`, { value: newOptValue.trim() });
      setNewOptValue("");
      setAddOptForAttr(null);
      fetchAttributes();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed");
    }
  };

  const handleUpdateOpt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOpt) return;
    try {
      await api.put(`/taxonomy-attributes/${editingOpt.attr.id}/options/${editingOpt.opt.id}`, {
        value: optForm.value,
      });
      setEditingOpt(null);
      setOptForm({ value: "" });
      fetchAttributes();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed");
    }
  };

  const handleDeactivateOpt = async (attrId: number, optId: number) => {
    if (!confirm("Deactivate this option?")) return;
    try {
      await api.delete(`/taxonomy-attributes/${attrId}/options/${optId}`);
      fetchAttributes();
    } catch {
      alert("Failed to deactivate");
    }
  };

  const handleActivateOpt = async (attrId: number, optId: number) => {
    try {
      await api.patch(`/taxonomy-attributes/${attrId}/options/${optId}/activate`);
      fetchAttributes();
    } catch {
      alert("Failed to activate");
    }
  };

  const openEditAttr = (a: TaxonomyAttribute) => {
    setEditingAttr(a);
    setAttrForm({ name: a.name, sort_order: a.sort_order, initialOptions: "" });
  };

  const openEditOpt = (attr: TaxonomyAttribute, opt: TaxonomyAttributeOption) => {
    setEditingOpt({ attr, opt });
    setOptForm({ value: opt.value });
  };

  const toggleExpand = (id: number) => {
    setExpandedAttrs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTaxonomy = taxonomies.find((t) => t.id === selectedTaxonomyId);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-display text-3xl font-bold text-text-primary">Taxonomy Attributes</h1>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <label className="text-sm font-medium text-text-muted">Select taxonomy:</label>
        <select
          value={selectedTaxonomyId ?? ""}
          onChange={(e) => setSelectedTaxonomyId(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary min-w-[200px]"
        >
          <option value="">— Select —</option>
          {taxonomies.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {selectedTaxonomy && (
          <button
            onClick={() => {
              setShowAddAttr(true);
              setAttrForm({ name: "", sort_order: attributes.length, initialOptions: "" });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add Attribute
          </button>
        )}
      </div>

      {showAddAttr && selectedTaxonomyId && (
        <div className="mb-6 bg-white rounded-2xl border border-sand-divider p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-lg font-semibold text-text-primary">Add Attribute</h2>
            <button onClick={() => setShowAddAttr(false)} className="text-text-muted hover:text-text-primary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleAddAttr} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Name"
              value={attrForm.name}
              onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })}
              className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
            <input
              type="number"
              placeholder="Sort order"
              value={attrForm.sort_order}
              onChange={(e) => setAttrForm({ ...attrForm, sort_order: parseInt(e.target.value, 10) || 0 })}
              min={0}
              className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <input
              placeholder="Initial options (comma-separated)"
              value={attrForm.initialOptions}
              onChange={(e) => setAttrForm({ ...attrForm, initialOptions: e.target.value })}
              className="md:col-span-2 px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary placeholder:text-text-muted/60 focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90">
              Add
            </button>
          </form>
        </div>
      )}

      {editingAttr && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-sand-divider p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-lg font-semibold text-text-primary">Edit Attribute</h2>
              <button onClick={() => setEditingAttr(null)} className="text-text-muted hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateAttr} className="grid gap-4">
              <input
                placeholder="Name"
                value={attrForm.name}
                onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })}
                className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                required
              />
              <input
                type="number"
                placeholder="Sort order"
                value={attrForm.sort_order}
                onChange={(e) => setAttrForm({ ...attrForm, sort_order: parseInt(e.target.value, 10) || 0 })}
                min={0}
                className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90">
                  Save
                </button>
                <button type="button" onClick={() => setEditingAttr(null)} className="px-4 py-2 border border-sand-divider rounded-xl text-text-primary hover:bg-sand-divider/30">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingOpt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-sand-divider p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-lg font-semibold text-text-primary">Edit Option</h2>
              <button onClick={() => setEditingOpt(null)} className="text-text-muted hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateOpt} className="grid gap-4">
              <input
                placeholder="Value"
                value={optForm.value}
                onChange={(e) => setOptForm({ value: e.target.value })}
                className="px-4 py-2 border border-sand-divider rounded-xl bg-white text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                required
              />
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl font-medium hover:opacity-90">
                  Save
                </button>
                <button type="button" onClick={() => setEditingOpt(null)} className="px-4 py-2 border border-sand-divider rounded-xl text-text-primary hover:bg-sand-divider/30">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!selectedTaxonomyId ? (
        <div className="bg-white rounded-2xl border border-sand-divider p-10 text-center text-text-muted">
          Select a taxonomy to manage its attributes.
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-sand-divider p-10 text-center text-text-muted">
          Loading...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-sand-divider overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-light border-b border-sand-divider">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-medium text-text-muted w-8"></th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Name</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Sort</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Status</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Options</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attributes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-text-muted">
                      No attributes yet. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  attributes.map((attr) => (
                    <React.Fragment key={attr.id}>
                      <tr className="border-b border-sand-divider">
                        <td className="py-2 px-4">
                          <button
                            onClick={() => toggleExpand(attr.id)}
                            className="p-0.5 text-text-muted hover:text-text-primary"
                          >
                            {expandedAttrs.has(attr.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-2 px-4 font-medium text-text-primary">{attr.name}</td>
                        <td className="py-2 px-4 text-text-muted">{attr.sort_order}</td>
                        <td className="py-2 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              attr.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {attr.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-text-muted">
                          {(attr.options || []).length} option(s)
                        </td>
                        <td className="py-2 px-4 flex gap-2">
                          <button
                            onClick={() => openEditAttr(attr)}
                            className="p-2 border border-sand-divider rounded-xl hover:bg-sand-divider/30 text-text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {attr.is_active ? (
                            <button
                              onClick={() => handleDeactivateAttr(attr.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-xl"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateAttr(attr.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-xl"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedAttrs.has(attr.id) && (
                        <tr key={`${attr.id}-options`} className="bg-background-light/50">
                          <td colSpan={6} className="py-3 px-4">
                            <div className="pl-6 space-y-2">
                              <div className="flex flex-wrap gap-2 mb-2">
                                {(attr.options || []).map((opt) => (
                                  <span
                                    key={opt.id}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${
                                      opt.is_active ? "bg-white border border-sand-divider" : "bg-gray-100 text-gray-600"
                                    }`}
                                  >
                                    {opt.value}
                                    <button
                                      onClick={() => openEditOpt(attr, opt)}
                                      className="p-0.5 hover:bg-sand-divider/50 rounded"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    {opt.is_active ? (
                                      <button
                                        onClick={() => handleDeactivateOpt(attr.id, opt.id)}
                                        className="p-0.5 text-red-600 hover:bg-red-50 rounded"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleActivateOpt(attr.id, opt.id)}
                                        className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                                      >
                                        <RefreshCw className="h-3 w-3" />
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>
                              {addOptForAttr === attr.id ? (
                                <form onSubmit={handleAddOpt} className="flex gap-2">
                                  <input
                                    placeholder="New option value"
                                    value={newOptValue}
                                    onChange={(e) => setNewOptValue(e.target.value)}
                                    className="px-3 py-1.5 border border-sand-divider rounded-lg text-sm"
                                    autoFocus
                                  />
                                  <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm">
                                    Add
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddOptForAttr(null);
                                      setNewOptValue("");
                                    }}
                                    className="px-3 py-1.5 border border-sand-divider rounded-lg text-sm"
                                  >
                                    Cancel
                                  </button>
                                </form>
                              ) : (
                                <button
                                  onClick={() => setAddOptForAttr(attr.id)}
                                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <Plus className="h-4 w-4" /> Add option
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
