import Link from "next/link";
import { Icon } from "../ui/icon";

export interface NavItemProps {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
}

export function NavItem({ icon, label, href, active = false }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-300 ease-in-out text-[0.75rem] tracking-wide uppercase font-medium ${
        active
          ? "text-primary font-bold bg-surface-container-high"
          : "text-slate-400 hover:bg-surface-container-high"
      }`}
    >
      <Icon name={icon} filled={active} />
      <span>{label}</span>
      {active && (
        <span className="ml-auto text-tertiary text-base leading-none">•</span>
      )}
    </Link>
  );
}
