"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/provider", label: "Home" },
  { href: "/provider/requests", label: "Request management" },
  { href: "/provider/schedule", label: "Schedule" },
  { href: "/provider/capabilities", label: "Capabilities" },
  { href: "/provider/company", label: "Company profile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/provider") {
    return pathname === "/provider";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ProviderTopNav() {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto">
      <div className="flex items-center justify-center gap-8 whitespace-nowrap">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition ${
                active
                  ? "text-slate-950"
                  : "text-slate-500 hover:text-slate-950"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}