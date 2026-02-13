"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import api, { getApiErrorDetail } from "@/lib/api";
import { ChevronLeft } from "lucide-react";

const ADDRESS_TYPES = ["home", "office", "other"] as const;

export default function NewAddressPage() {
  const { isAuthenticated } = useAuthStore();
  const t = useI18nStore((s) => s.t);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromCheckout = searchParams.get("from") === "checkout";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    contact_name: "",
    phone: "",
    address_type: "home" as "home" | "office" | "other",
    lat: null as number | null,
    lng: null as number | null,
    street: "",
    city: "",
    country: "United Arab Emirates",
    postal_code: "",
    state_province: "",
    label: "",
    company_name: "",
    building_name: "",
    floor_office: "",
    is_default: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.contact_name.trim() || !form.phone.trim() || !form.street.trim() || !form.city.trim() || !form.country.trim()) {
      setError(t("please_fill_required"));
      return;
    }
    setSaving(true);
    try {
      await api.post("/addresses", {
        contact_name: form.contact_name.trim(),
        phone: form.phone.trim(),
        address_type: form.address_type,
        lat: form.lat ?? undefined,
        lng: form.lng ?? undefined,
        street: form.street.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        postal_code: form.postal_code.trim() || undefined,
        state_province: form.state_province.trim() || undefined,
        label: form.address_type === "other" ? form.label.trim() || undefined : undefined,
        company_name: form.address_type === "office" ? form.company_name.trim() || undefined : undefined,
        building_name: form.building_name.trim() || undefined,
        floor_office: form.floor_office.trim() || undefined,
        is_default: fromCheckout || form.is_default,
      });
      router.push(fromCheckout ? "/checkout" : "/profile/addresses");
    } catch (err: unknown) {
      setError(getApiErrorDetail(err, t("failed_to_save_address")));
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    router.push("/login?redirect=/profile/addresses/new");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f8f7f6] flex flex-col">
      <nav className="sticky top-0 z-50 bg-[#f8f7f6]/80 backdrop-blur-md px-4 py-4 flex items-center border-b border-[#e6e1db]">
        <Link href="/profile/addresses" className="size-10 flex items-center justify-center rounded-full hover:bg-white/80">
          <ChevronLeft className="size-6 text-[#181511]" />
        </Link>
        <h1 className="serif-font text-xl font-semibold tracking-tight text-[#181511] flex-1 text-center">
          {t("add_new_address")}
        </h1>
        <div className="size-10" />
      </nav>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full pb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#897961] mb-1">{t("contact_name")}</label>
            <input
              className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] focus:border-[#ec9213]"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              placeholder={t("full_name")}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#897961] mb-1">{t("phone")}</label>
            <input
              className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] focus:border-[#ec9213]"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t("mobile_placeholder")}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#897961] mb-1">{t("address_type")}</label>
            <div className="flex gap-2">
              {ADDRESS_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, address_type: type })}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${
                    form.address_type === type
                      ? "border-[#ec9213] bg-[#ec9213]/10 text-[#ec9213]"
                      : "border-[#e5e1da] bg-white text-[#897961]"
                  }`}
                >
                  {type === "home" ? t("address_type_home") : type === "office" ? t("address_type_office") : t("address_type_other")}
                </button>
              ))}
            </div>
          </div>
          {form.address_type === "office" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#897961] mb-1">{t("company_name")}</label>
              <input
                className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] focus:border-[#ec9213]"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder={t("company_name")}
              />
            </div>
          )}
          {(form.address_type === "home" || form.address_type === "other") && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#897961] mb-1">{t("building_name")}</label>
              <input
                className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] focus:border-[#ec9213]"
                value={form.building_name}
                onChange={(e) => setForm({ ...form, building_name: e.target.value })}
                placeholder={t("label_optional")}
              />
            </div>
          )}
          {form.address_type === "other" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#897961] mb-1">{t("label_optional")}</label>
              <input
                className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] focus:border-[#ec9213]"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Apartment 104"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#897961] mb-1">{t("street_address_placeholder")}</label>
            <input
              className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] focus:border-[#ec9213]"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              placeholder={t("street_address_placeholder")}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#897961] mb-1">{t("city_placeholder")}</label>
              <input
                className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] focus:border-[#ec9213]"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder={t("city_placeholder")}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#897961] mb-1">{t("emirate_placeholder")}</label>
              <input
                className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] focus:border-[#ec9213]"
                value={form.state_province}
                onChange={(e) => setForm({ ...form, state_province: e.target.value })}
                placeholder={t("emirate_placeholder")}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#897961] mb-1">{t("floor_office")}</label>
            <input
              className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] focus:border-[#ec9213]"
              value={form.floor_office}
              onChange={(e) => setForm({ ...form, floor_office: e.target.value })}
              placeholder="e.g. Level 15, Apt 104"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#897961] mb-1">{t("country")}</label>
            <input
              className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] focus:border-[#ec9213]"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              required
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="rounded border-[#e5e1da] text-[#ec9213] focus:ring-[#ec9213]"
            />
            <span className="text-sm text-[#181511]">{t("set_as_default")}</span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#ec9213] text-white py-4 rounded-xl font-bold text-base shadow-lg shadow-[#ec9213]/25 disabled:opacity-70"
          >
            {saving ? t("saving") : t("add_new_address")}
          </button>
        </form>
      </main>
    </div>
  );
}
