"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import api from "@/lib/api";
import { PageLoader } from "@/components/PageLoader";
import { Home, Building2, MapPin, ChevronLeft, Pencil } from "lucide-react";

export interface SavedAddress {
  address_code: string;
  contact_name: string;
  phone: string;
  address_type: string;
  street: string;
  city: string;
  country: string;
  postal_code?: string | null;
  state_province?: string | null;
  label?: string | null;
  company_name?: string | null;
  building_name?: string | null;
  floor_office?: string | null;
  is_default: boolean;
  lat?: number | null;
  lng?: number | null;
}

function AddressIcon({ type }: { type: string }) {
  const t = useI18nStore((s) => s.t);
  if (type === "office") return <Building2 className="size-5 text-[#897961]" />;
  if (type === "other") return <MapPin className="size-5 text-[#897961]" />;
  return <Home className="size-5 text-[#ec9213]" />;
}

function addressTitle(addr: SavedAddress): string {
  const t = useI18nStore.getState().t;
  if (addr.address_type === "home") return `${t("address_type_home")}${addr.building_name ? ` - ${addr.building_name}` : ""}`;
  if (addr.address_type === "office") return addr.company_name || t("address_type_office");
  return addr.label || t("address_type_other");
}

function addressSubtitle(addr: SavedAddress): string {
  if (addr.address_type === "office" && addr.floor_office) return addr.floor_office;
  if (addr.address_type === "other" && addr.floor_office) return addr.floor_office;
  return "";
}

export default function AddressesPage() {
  const { isAuthenticated } = useAuthStore();
  const t = useI18nStore((s) => s.t);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToCheckout = searchParams.get("returnTo") === "/checkout";
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/profile/addresses");
      return;
    }
    (async () => {
      try {
        const r = await api.get<SavedAddress[]>("/addresses");
        setAddresses(r.data || []);
      } catch {
        setAddresses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, router]);

  const setDefault = async (addressCode: string) => {
    try {
      await api.patch(`/addresses/${addressCode}/default`);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, is_default: a.address_code === addressCode }))
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#f8f7f6] flex flex-col">
      <nav className="sticky top-0 z-50 bg-[#f8f7f6]/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-[#e6e1db]">
        <Link
          href="/profile"
          className="size-10 flex items-center justify-center rounded-full hover:bg-white/80 transition-colors"
        >
          <ChevronLeft className="size-6 text-[#181511]" />
        </Link>
        <h1 className="serif-font text-xl font-semibold tracking-tight text-[#181511]">
          {t("shipping_addresses")}
        </h1>
        <div className="size-10" />
      </nav>

      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full pb-32">
        {returnToCheckout && (
          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#ec9213] mb-2"
          >
            <ChevronLeft className="size-4" />
            {t("back_to_checkout")}
          </Link>
        )}
        <div className="py-2">
          <p className="text-sm font-medium text-[#897961] uppercase tracking-widest mb-1">
            {t("saved_locations")}
          </p>
          <p className="text-xs text-[#897961]/80">{t("saved_locations_hint")}</p>
        </div>

        {loading ? (
          <PageLoader className="py-12 min-h-[200px]" />
        ) : (
          addresses.map((addr) => (
            <div
              key={addr.address_code}
              className={`relative group rounded-xl p-5 shadow-sm transition-all border-2 ${
                addr.is_default
                  ? "bg-white border-[#ec9213]"
                  : "bg-white border-[#e6e1db] hover:border-[#d6cfc5]"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-10 rounded-lg flex items-center justify-center ${
                      addr.is_default ? "bg-[#ec9213]/10 text-[#ec9213]" : "bg-[#f2efe9] text-[#897961]"
                    }`}
                  >
                    <AddressIcon type={addr.address_type} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight text-[#181511]">
                      {addressTitle(addr)}
                    </h3>
                    {addressSubtitle(addr) && (
                      <p className="text-xs text-[#897961] mt-0.5">{addressSubtitle(addr)}</p>
                    )}
                    {addr.is_default && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#ec9213] text-white uppercase tracking-wider mt-1">
                        {t("default")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Link
                    href={`/profile/addresses/${addr.address_code}/edit`}
                    className="p-2 text-[#897961] hover:text-[#ec9213] transition-colors"
                  >
                    <Pencil className="size-5" />
                  </Link>
                </div>
              </div>
              <div className="space-y-1 text-[#4d4439] text-sm leading-relaxed">
                <p>{addr.street}</p>
                <p>
                  {addr.city}
                  {addr.state_province ? `, ${addr.state_province}` : ""} {addr.country}
                </p>
                <p className="pt-2 flex items-center gap-2 font-medium">
                  <span className="text-[#897961]">📞</span> {addr.phone}
                </p>
              </div>
              {!addr.is_default && (
                <button
                  type="button"
                  onClick={() => setDefault(addr.address_code)}
                  className="mt-3 text-xs font-semibold text-[#ec9213] uppercase tracking-wider"
                >
                  {t("set_as_default")}
                </button>
              )}
            </div>
          ))
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#f8f7f6] via-[#f8f7f6]/95 to-transparent pt-8 pb-6 px-4">
        <div className="max-w-lg mx-auto">
          <Link
            href={returnToCheckout ? "/profile/addresses/new?from=checkout" : "/profile/addresses/new"}
            className="w-full bg-[#ec9213] hover:bg-[#d48311] text-white h-14 rounded-xl font-bold text-base shadow-lg shadow-[#ec9213]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <MapPin className="size-5" />
            {t("add_new_address")}
          </Link>
        </div>
      </div>
    </div>
  );
}
