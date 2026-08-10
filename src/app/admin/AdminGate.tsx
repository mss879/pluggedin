"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "admin@pluggedin.com";

export default function AdminGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Verify the actual Supabase session (validated against the auth server) and
    // confirm it belongs to the admin — not just the presence of a localStorage
    // flag, which anyone could set. Data is still protected by RLS as a second
    // layer; this hardens the UI gate.
    const checkAuth = async () => {
      if (pathname === "/admin/login") {
        if (!cancelled) setIsAuthenticated(true);
        return;
      }

      if (!supabase) {
        if (!cancelled) {
          setIsAuthenticated(false);
          router.replace("/admin/login");
        }
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const ok = !error && data?.user?.email === ADMIN_EMAIL;

      if (cancelled) return;
      if (ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("pluggedin_admin_session");
        setIsAuthenticated(false);
        router.replace("/admin/login");
      }
    };

    checkAuth();

    // Re-check on auth changes (e.g. logout / token expiry / another tab)
    const { data: sub } = supabase
      ? supabase.auth.onAuthStateChange(() => checkAuth())
      : { data: null };

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, [pathname, router]);

  // Loading state while checking authentication
  if (isAuthenticated === null && pathname !== "/admin/login") {
    return (
      <div className="w-screen h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-inter">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
            Verifying Admin Session...
          </span>
        </div>
      </div>
    );
  }

  // Let login page render without sidebar
  if (pathname === "/admin/login") {
    return <div className="bg-slate-50 min-h-screen text-slate-900">{children}</div>;
  }

  // Admin Dashboard base wrapper
  return (
    <div className="w-screen h-screen bg-slate-50 text-slate-800 font-inter select-none flex overflow-hidden relative">
      {/* Background ambient glow */}
      <div className="absolute top-[-10%] right-[10%] w-[500px] h-[500px] rounded-full blur-[150px] opacity-40 pointer-events-none bg-radial from-purple-200/50 to-transparent" />
      <div className="absolute bottom-[-10%] left-[10%] w-[500px] h-[500px] rounded-full blur-[150px] opacity-30 pointer-events-none bg-radial from-emerald-100/40 to-transparent" />
      
      <div className="relative z-10 w-full h-full flex overflow-hidden">
        {children}
      </div>
    </div>
  );
}
