import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
        <p>© 2026 Kordyne. All rights reserved.</p>

        <div className="flex flex-col gap-2 md:items-end">
          <p>Digital infrastructure for advanced parts.</p>

          <div className="flex flex-wrap gap-4">
            <Link href="/terms" className="hover:text-gray-900 hover:underline">
              Terms & Conditions
            </Link>
            <Link href="/privacy" className="hover:text-gray-900 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}