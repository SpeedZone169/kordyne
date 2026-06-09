import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="h-1 bg-[#00bdde]" />
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md">
            <p className="text-sm text-slate-500">
              &copy; 2026 Kordyne. All rights reserved.
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              CAD-to-manufacturing workspace for controlled part records,
              revision-aware collaboration, and manufacturing execution.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-600">
              <Link href="/platform" className="transition hover:text-[#003040]">
                Product
              </Link>
              <Link href="/pricing" className="transition hover:text-[#003040]">
                Pricing
              </Link>
              <Link href="/providers" className="transition hover:text-[#003040]">
                Providers
              </Link>
              <Link href="/contact" className="transition hover:text-[#003040]">
                Contact
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <Link href="/terms" className="transition hover:text-[#003040]">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="transition hover:text-[#003040]">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
