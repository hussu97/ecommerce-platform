"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCartStore } from "@/stores/useCartStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/PageLoader";
import Link from "next/link";
import Image from "next/image";
import { Truck, ChevronRight, Home, Building2, MapPin } from "lucide-react";

const stripePromise = loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");

function CheckoutForm({
  clientSecret,
  addressCode,
  total,
  idempotencyKey,
}: {
  clientSecret: string;
  addressCode: string;
  total: number;
  idempotencyKey: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();
  const t = useI18nStore((s) => s.t);
  const { items, clearCart } = useCartStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (paymentError) {
      setError(paymentError.message ?? t("unexpected_error"));
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        const headers = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;
        const orderRes = await api.post(
          "/orders/",
          {
            items: items.map((item) => ({
              product_slug: item.product.slug ?? item.product.id,
              child_code: item.child?.code ?? "",
              quantity: item.quantity,
              price_at_purchase: item.product.price,
            })),
            total_amount: total,
            address_code: addressCode,
          },
          headers ? { headers } : {}
        );

        await clearCart();
        const orderId = orderRes?.data?.id;
        router.push(orderId ? `/orders/success?order_id=${orderId}` : "/orders/success");
      } catch (err) {
        console.error("Failed to create order:", err);
        setError(t("payment_order_failed"));
        setProcessing(false);
      }
    } else {
      setError(t("payment_failed"));
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-[#ec9213] text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-[#ec9213]/30"
        isLoading={processing}
      >
        {processing ? t("processing") : `${t("place_order")} · AED ${total.toFixed(2)}`}
      </Button>
    </form>
  );
}

interface SavedAddress {
  address_code: string;
  contact_name: string;
  phone: string;
  address_type: string;
  street: string;
  city: string;
  country: string;
  state_province?: string | null;
  postal_code?: string | null;
  is_default: boolean;
}

export default function CheckoutPage() {
  const { items, getCartTotal } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const t = useI18nStore((s) => s.t);
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressCode, setSelectedAddressCode] = useState<string | null>(null);
  const [step1Error, setStep1Error] = useState("");
  const [inlineAddress, setInlineAddress] = useState({
    contact_name: "",
    phone: "",
    street: "",
    city: "",
    state_province: "",
    country: "United Arab Emirates",
    postal_code: "",
  });
  const shippingCost = 25;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/checkout");
      return;
    }
    (async () => {
      try {
        const r = await api.get<SavedAddress[]>("/addresses");
        const list = r.data || [];
        setAddresses(list);
        const defaultAddr = list.find((a) => a.is_default) || list[0];
        if (defaultAddr) setSelectedAddressCode(defaultAddr.address_code);
      } catch {
        setAddresses([]);
      } finally {
        setAddressesLoading(false);
      }
    })();
  }, [isAuthenticated, router]);

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error("");
    if (items.length === 0) return;

    let addressCodeToUse = selectedAddressCode;
    if (!addressCodeToUse && addresses.length === 0) {
      if (!inlineAddress.street.trim() || !inlineAddress.city.trim() || !inlineAddress.country.trim() || !inlineAddress.contact_name.trim() || !inlineAddress.phone.trim()) {
        setStep1Error(t("please_fill_required"));
        return;
      }
      try {
        const created = await api.post<SavedAddress>("/addresses", {
          contact_name: inlineAddress.contact_name,
          phone: inlineAddress.phone,
          address_type: "home",
          street: inlineAddress.street,
          city: inlineAddress.city,
          country: inlineAddress.country,
          state_province: inlineAddress.state_province || undefined,
          postal_code: inlineAddress.postal_code || undefined,
        });
        addressCodeToUse = created.data.address_code;
      } catch (err) {
        console.error("Failed to create address", err);
        alert(t("failed_to_create_order"));
        return;
      }
    }
    if (!addressCodeToUse) return;

    try {
      const key = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "";
      setIdempotencyKey(key);
      const totalAmount = getCartTotal() + (addresses.find((a) => a.address_code === addressCodeToUse)?.country === "United Arab Emirates" || inlineAddress.country === "United Arab Emirates" ? 0 : shippingCost);
      const response = await api.post(
        "/orders/create-payment-intent",
        { amount: totalAmount },
        key ? { headers: { "Idempotency-Key": key } } : {}
      );
      const secret = response.data?.client_secret ?? "mock_secret_for_testing";
      setClientSecret(secret);
      setSelectedAddressCode(addressCodeToUse);
      setStep(2);
    } catch (error) {
      console.error("Error creating payment intent:", error);
      alert(t("failed_to_initialize_payment"));
    }
  };

  const selectedAddress = addresses.find((a) => a.address_code === selectedAddressCode);
  const total = getCartTotal() + (selectedAddress?.country === "United Arab Emirates" || (addresses.length === 0 && inlineAddress.country === "United Arab Emirates") ? 0 : shippingCost);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <h1 className="serif-font text-2xl font-bold text-[#181511]">{t("your_cart_empty_short")}</h1>
        <p className="text-[#897961] mt-2">{t("add_items_to_cart")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f7f6]">
      <header className="flex items-center bg-[#f8f7f6]/80 backdrop-blur-md p-4 pb-2 md:py-6 justify-between sticky top-0 z-50 border-b border-[#e5e1da]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center rounded-full size-10 bg-white shadow-sm text-[#181511]"
          >
            ←
          </button>
          <h2 className="serif-font text-xl md:text-2xl font-bold leading-tight tracking-tight text-[#181511]">
            {t("checkout_title")}
          </h2>
        </div>
        <span className="text-xs font-bold text-[#ec9213] px-3 py-1 bg-[#ec9213]/10 rounded-full">
          {t("step")} {step} {t("of")} 2
        </span>
      </header>

      <div className="flex flex-col md:grid md:grid-cols-[1fr,360px] md:gap-8 gap-8 px-4 py-6 pb-40 md:pb-8 md:py-8">
        <div className="flex flex-col gap-8">
        {step === 1 ? (
          <>
            {/* Delivery Address */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="serif-font text-lg font-bold text-[#181511]">{t("delivery_address")}</h3>
                {addresses.length > 0 && (
                  <Link href="/profile/addresses" className="text-[#ec9213] text-xs font-semibold">{t("change")}</Link>
                )}
              </div>
              {addressesLoading ? (
                <PageLoader className="py-8 min-h-[120px]" />
              ) : addresses.length > 0 ? (
                <form onSubmit={handleAddressSubmit} className="space-y-3">
                  <div className="space-y-2">
                    {addresses.map((addr) => (
                      <button
                        key={addr.address_code}
                        type="button"
                        onClick={() => setSelectedAddressCode(addr.address_code)}
                        className={`w-full text-left rounded-xl p-4 border-2 transition-all ${
                          selectedAddressCode === addr.address_code
                            ? "border-[#ec9213] bg-[#ec9213]/5"
                            : "border-[#e5e1da] bg-white hover:border-[#d6cfc5]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-[#f2efe9] flex items-center justify-center text-[#897961]">
                            {addr.address_type === "office" ? <Building2 className="size-5" /> : addr.address_type === "other" ? <MapPin className="size-5" /> : <Home className="size-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-[#181511]">{addr.contact_name}</p>
                            <p className="text-sm text-[#897961]">{addr.street}, {addr.city}, {addr.country}</p>
                            <p className="text-xs text-[#897961]">{addr.phone}</p>
                          </div>
                          {selectedAddressCode === addr.address_code && (
                            <div className="ml-auto size-6 rounded-full bg-[#ec9213] flex items-center justify-center">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <Link
                    href="/profile/addresses/new?from=checkout"
                    className="block text-center py-2 text-[#ec9213] text-sm font-semibold"
                  >
                    + {t("add_new_address")}
                  </Link>
                </form>
              ) : (
                <form onSubmit={handleAddressSubmit} className="space-y-3">
                  {step1Error && <p className="text-sm text-red-600 mb-3">{step1Error}</p>}
                  <p className="text-sm text-[#897961] mb-3">{t("add_delivery_address_hint")}</p>
                  <input
                    className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] placeholder:text-[#897961]/60"
                    placeholder={t("full_name")}
                    value={inlineAddress.contact_name}
                    onChange={(e) => setInlineAddress({ ...inlineAddress, contact_name: e.target.value })}
                    required
                  />
                  <input
                    className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] placeholder:text-[#897961]/60"
                    type="tel"
                    placeholder={t("mobile_placeholder")}
                    value={inlineAddress.phone}
                    onChange={(e) => setInlineAddress({ ...inlineAddress, phone: e.target.value })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] placeholder:text-[#897961]/60"
                      placeholder={t("city_placeholder")}
                      value={inlineAddress.city}
                      onChange={(e) => setInlineAddress({ ...inlineAddress, city: e.target.value })}
                      required
                    />
                    <input
                      className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] placeholder:text-[#897961]/60"
                      placeholder={t("emirate_placeholder")}
                      value={inlineAddress.state_province}
                      onChange={(e) => setInlineAddress({ ...inlineAddress, state_province: e.target.value })}
                    />
                  </div>
                  <input
                    className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] placeholder:text-[#897961]/60"
                    placeholder={t("street_address_placeholder")}
                    value={inlineAddress.street}
                    onChange={(e) => setInlineAddress({ ...inlineAddress, street: e.target.value })}
                    required
                  />
                  <input
                    className="w-full bg-white border border-[#e5e1da] rounded-xl px-4 py-3.5 text-sm focus:ring-1 focus:ring-[#ec9213] placeholder:text-[#897961]/60"
                    placeholder={t("country")}
                    value={inlineAddress.country}
                    onChange={(e) => setInlineAddress({ ...inlineAddress, country: e.target.value })}
                    required
                  />
                </form>
              )}
            </section>

            {/* Shipping Method */}
            <section className="flex flex-col gap-4">
              <h3 className="serif-font text-lg font-bold text-[#181511]">{t("shipping_method")}</h3>
              <div className="bg-white rounded-2xl p-4 flex items-center justify-between border border-[#ec9213] shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-[#ec9213]/10 flex items-center justify-center text-[#ec9213]">
                    <Truck className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#181511]">{t("express_delivery")}</p>
                    <p className="text-xs text-[#897961]">{t("express_delivery_time")}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-[#ec9213]">
                  {(selectedAddress?.country ?? inlineAddress.country) === "United Arab Emirates" ? t("free") : `AED ${shippingCost}`}
                </p>
              </div>
            </section>
          </>
        ) : null}
        {/* Desktop: Continue to payment inside left column */}
        {step === 1 && (
          <div className="hidden md:block">
            <Button
              onClick={handleAddressSubmit}
              className="w-full max-w-md bg-[#ec9213] text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-[#ec9213]/30 flex items-center justify-center gap-2"
            >
              {t("continue_to_payment")}
              <ChevronRight className="size-5" />
            </Button>
          </div>
        )}
        </div>

        {/* Order Summary - always visible, sticky on desktop */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e1da] md:sticky md:top-24 h-fit">
          <h3 className="serif-font text-lg font-bold mb-6 text-[#181511]">{t("order_summary")}</h3>
          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-lg overflow-hidden bg-[#f8f7f6] shrink-0 relative">
                    {item.product.image_url ? (
                      <Image
                        src={item.product.image_url}
                        alt={item.product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#897961]">
                        —
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#181511]">{item.product.name}</p>
                    <p className="text-[10px] text-[#897961]">{t("qty")}: {item.quantity}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-[#ec9213]">
                  AED {(item.product.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-3 pt-4 border-t border-[#f8f7f6]">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#897961]">{t("subtotal")}</span>
              <span className="font-medium">AED {getCartTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#897961]">{t("shipping")}</span>
              <span className="font-medium">
                {(selectedAddress?.country ?? inlineAddress.country) === "United Arab Emirates" ? t("free") : `AED ${shippingCost}`}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 mt-1 border-t border-dashed border-[#e5e1da]">
              <span className="serif-font text-lg font-bold">{t("total")}</span>
              <span className="serif-font text-xl font-bold text-[#ec9213]">
                AED {total.toFixed(2)}
              </span>
            </div>
          </div>
        </section>

        {/* Payment - step 2 */}
        {step === 2 && (
          <section className="flex flex-col gap-4">
            <h3 className="serif-font text-lg font-bold text-[#181511]">{t("payment")}</h3>
            {clientSecret === "mock_secret_for_testing" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-[#e5e1da] mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded bg-[#f3f3f3] flex items-center justify-center p-1">
                      <span className="text-xs font-bold">💳</span>
                    </div>
                    <p className="text-sm font-medium">{t("mock_payment")}</p>
                  </div>
                  <ChevronRight className="size-5 text-[#897961]" />
                </div>
                <Button
                  className="w-full bg-[#ec9213] text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-[#ec9213]/30"
                  onClick={async () => {
                    if (!selectedAddressCode) return;
                    try {
                      const key = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "";
                      const { items: cartItems, clearCart } = useCartStore.getState();
                      const orderRes = await api.post(
                        "/orders/",
                        {
                          items: cartItems.map((item) => ({
                            product_slug: item.product.slug ?? item.product.id,
                            child_code: item.child?.code ?? "",
                            quantity: item.quantity,
                            price_at_purchase: item.product.price,
                          })),
                          total_amount: total,
                          address_code: selectedAddressCode,
                        },
                        key ? { headers: { "Idempotency-Key": key } } : {}
                      );
                      await clearCart();
                      const orderId = orderRes?.data?.id;
                      router.push(orderId ? `/orders/success?order_id=${orderId}` : "/orders/success");
                    } catch (err) {
                      console.error("Mock order creation failed", err);
                      alert(t("failed_to_create_order"));
                    }
                  }}
                >
                  {t("place_order")}
                </Button>
              </div>
            ) : clientSecret ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5e1da]">
                <Elements
                  options={{ clientSecret, appearance: { theme: "stripe" } }}
                  stripe={stripePromise}
                >
                  <CheckoutForm
                    clientSecret={clientSecret}
                    addressCode={selectedAddressCode!}
                    total={total}
                    idempotencyKey={idempotencyKey}
                  />
                </Elements>
              </div>
            ) : null}
          </section>
        )}
      </div>

      {/* Fixed bottom CTA - step 1, mobile only; desktop show inline above or in left column */}
      {step === 1 && (
        <>
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] md:hidden bg-white/90 backdrop-blur-xl border-t border-[#e5e1da] px-6 pt-4 pb-8 z-50">
            <Button
              onClick={handleAddressSubmit}
              className="w-full bg-[#ec9213] text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-[#ec9213]/30 flex items-center justify-center gap-2"
            >
              {t("continue_to_payment")}
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
