import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-gray-900">
          Kordyne
        </Link>

        <nav className="hidden gap-8 text-sm text-gray-600 md:flex">
          <Link href="/" className="transition hover:text-gray-900">
            Home
          </Link>
          <Link href="/platform" className="transition hover:text-gray-900">
            Platform
          </Link>
          <Link href="/enterprise" className="transition hover:text-gray-900">
            Enterprise
          </Link>
          <Link href="/contact" className="transition hover:text-gray-900">
            Contact
          </Link>
        </nav>

        <Link
          href="/contact"
          className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          Request Demo
        </Link>
      </div>
    </header>
  );
}