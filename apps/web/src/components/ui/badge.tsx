interface BadgeProps {
  label: string;
  className?: string;
}

export function Badge({ label, className = "" }: BadgeProps) {
  return (
    <span
      className={`text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded ${className}`}
    >
      {label}
    </span>
  );
}
