import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md">
            <p className="text-sm text-gray-500">
              © 2026 Kordyne. All rights reserved.
            </p>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              Digital infrastructure for advanced parts.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <Link href="/platform" className="transition hover:text-gray-950">
                Platform
              </Link>
              <Link
                href="/enterprise"
                className="transition hover:text-gray-950"
              >
                Enterprise
              </Link>
              <Link href="/contact" className="transition hover:text-gray-950">
                Contact
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
              <Link href="/terms" className="transition hover:text-gray-900">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="transition hover:text-gray-900">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}