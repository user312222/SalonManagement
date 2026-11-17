"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui";

const TABS = [
  { href: "/", label: "Bugün", icon: "today" },
  { href: "/clients", label: "Müşteriler", icon: "users" },
  { href: "/rules", label: "Kurallar", icon: "sliders" },
] as const;

export function Tabs() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="Ana menü">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className="tab" aria-current={active ? "page" : undefined}>
            <Icon name={t.icon} size={18} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
