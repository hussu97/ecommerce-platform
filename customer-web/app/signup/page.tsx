"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useI18nStore } from "@/stores/useI18nStore";
import api from "@/lib/api";
import { Sparkles } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const t = useI18nStore((s) => s.t);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError(t("passwords_do_not_match"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await api.post("/auth/signup", {
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
      });
      router.push("/login");
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t("failed_to_create_account"));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f8f7f6] text-[#181511] max-w-[430px] md:max-w-lg mx-auto">
      <div className="px-4 pt-6">
        <Link
          href="/login"
          className="flex items-center justify-center rounded-full size-10 bg-white/50 border border-[#e5e1da] backdrop-blur-sm"
        >
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center pt-8 pb-10">
        <div className="flex size-16 items-center justify-center rounded-full bg-[#ec9213]/10 text-[#ec9213] mb-6 shadow-sm">
          <Sparkles className="size-8" />
        </div>
        <h1 className="serif-font text-3xl font-bold tracking-tight text-center">{t("welcome_title")}</h1>
        <p className="text-[#897961] text-sm mt-2 text-center">{t("enter_sanctuary")}</p>
      </div>
      <div className="px-8 flex-1">
        <div className="flex border-b border-[#e5e1da] mb-8">
          <Link href="/login" className="flex-1 pb-3 text-sm font-medium text-[#897961] border-b-2 border-transparent text-center">
            {t("login")}
          </Link>
          <span className="flex-1 pb-3 text-sm font-bold border-b-2 border-[#ec9213] text-[#181511]">{t("sign_up")}</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#897961] px-1">{t("your_name")}</label>
            <input
              name="full_name"
              type="text"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder={t("name_placeholder")}
              className="w-full h-14 px-4 rounded-xl border border-[#e5e1da] bg-white text-[#181511] placeholder:text-[#897961]/40 focus:ring-2 focus:ring-[#ec9213] focus:border-[#ec9213] transition-all duration-200 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#897961] px-1">{t("email")}</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder={t("email_placeholder")}
              className="w-full h-14 px-4 rounded-xl border border-[#e5e1da] bg-white text-[#181511] placeholder:text-[#897961]/40 focus:ring-2 focus:ring-[#ec9213] focus:border-[#ec9213] transition-all duration-200 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#897961] px-1">{t("password")}</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder={t("password_placeholder")}
              className="w-full h-14 px-4 rounded-xl border border-[#e5e1da] bg-white text-[#181511] placeholder:text-[#897961]/40 focus:ring-2 focus:ring-[#ec9213] focus:border-[#ec9213] transition-all duration-200 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#897961] px-1">{t("confirm_password")}</label>
            <input
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder={t("password_placeholder")}
              className="w-full h-14 px-4 rounded-xl border border-[#e5e1da] bg-white text-[#181511] placeholder:text-[#897961]/40 focus:ring-2 focus:ring-[#ec9213] focus:border-[#ec9213] transition-all duration-200 outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full h-14 bg-[#ec9213] text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-[#ec9213]/20 hover:bg-[#d48310] active:scale-[0.98] transition-transform"
          >
            {t("create_your_account")}
          </Button>
        </form>
      </div>
      <footer className="p-8 text-center">
        <p className="text-xs text-[#897961] leading-relaxed">
          {t("terms_and_privacy")}
        </p>
      </footer>
    </div>
  );
}
