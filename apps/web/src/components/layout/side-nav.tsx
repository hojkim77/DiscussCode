"use client";

import { usePathname } from "next/navigation";
import { NavItem, NavItemProps } from "./nav-item";

const mainNavItems: Omit<NavItemProps, "active">[] = [
  { icon: "dashboard", label: "Dashboard", href: "/" },
  { icon: "forum", label: "Repo Talks", href: "/trending" },
  { icon: "bug_report", label: "Issue Talks", href: "/issues" },
  { icon: "code", label: "Snippets", href: "/snippets" },
  { icon: "settings", label: "Settings", href: "/settings" },
];

const bottomNavItems: Omit<NavItemProps, "active">[] = [
  { icon: "menu_book", label: "Documentation", href: "/docs" },
  { icon: "help_outline", label: "Support", href: "/support" },
];

export function SideNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="hidden md:flex h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex-col p-8 border-r border-transparent z-40">
      <div className="mb-10">
        <h2 className="text-on-surface font-bold text-xl tracking-tight">DiscussCode</h2>
        <p className="text-on-surface-variant text-xs mt-1">Developer Workspace</p>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {mainNavItems.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {bottomNavItems.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(item.href)} />
        ))}
      </div>
    </nav>
  );
}
