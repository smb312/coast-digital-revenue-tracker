import Link from "next/link";

// Top navigation for authenticated pages. Nav targets (Line Items, Overrides)
// are filled in as those screens land in later steps.
const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/line-items", label: "Line Items" },
];

export default function AppHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex flex-col leading-tight">
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              Coast Digital
            </span>
            <span className="text-base font-bold tracking-tight">
              Revenue Tracker
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">{email}</span>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
