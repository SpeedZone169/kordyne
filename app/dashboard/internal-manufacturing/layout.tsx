import type { ReactNode } from "react";

export default function InternalManufacturingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="-mx-6 lg:-mx-10">{children}</div>;
}