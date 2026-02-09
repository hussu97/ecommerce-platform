"use client";

import { useEffect } from "react";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:5173";

export default function AdminRedirect() {
  useEffect(() => {
    window.location.href = ADMIN_URL;
  }, []);
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <p className="text-gray-500">Redirecting to Admin Dashboard...</p>
    </div>
  );
}
