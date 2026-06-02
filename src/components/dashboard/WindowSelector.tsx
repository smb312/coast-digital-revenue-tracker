"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { WINDOW_OPTIONS, type WindowMonths } from "@/lib/forecast";

// Segmented control to choose the forecast window. Writes ?months= to the URL
// (on the current route) so the server component re-fetches the new range.
export default function WindowSelector({ value }: { value: WindowMonths }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(months: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("months", String(months));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div
      className={`inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm shadow-sm ${pending ? "opacity-60" : ""}`}
    >
      {WINDOW_OPTIONS.map((m) => {
        const active = m === value;
        return (
          <button
            key={m}
            onClick={() => select(m)}
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              active
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {m} mo
          </button>
        );
      })}
    </div>
  );
}
