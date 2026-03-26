import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "/provider", label: "Overview" },
  { href: "/provider/requests", label: "Requests" },
];

export default function ProviderShellNav() {
  return (
    <aside className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:w-72">
      <Link href="/provider" className="flex items-center gap-3">
        <Image
          src="/kordyne-logo.png"
          alt="Kordyne"
          width={40}
          height={40}
          className="h-10 w-auto"
          priority
        />
        <div>
          <p className="text-sm font-medium text-slate-500">Kordyne</p>
          <h2 className="text-xl font-semibold text-slate-900">
            Provider Portal
          </h2>
        </div>
      </Link>

      <nav className="mt-6 space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <div className="space-y-2">
          <p>Only packages explicitly shared with your organization appear here.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/privacy" className="hover:text-slate-700">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-700">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}