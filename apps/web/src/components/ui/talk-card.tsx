import { Icon } from "./icon";
import { Badge } from "./badge";

export interface TalkStat {
  icon: string;
  value: string | number;
}

export interface TalkCardProps {
  icon: string;
  iconClassName?: string;
  identifier: string;
  badge: string;
  title: string;
  excerpt: string;
  stats: TalkStat[];
}

export function TalkCard({
  icon,
  iconClassName = "text-tertiary",
  identifier,
  badge,
  title,
  excerpt,
  stats,
}: TalkCardProps) {
  return (
    <article className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-low/50 hover:bg-surface-container transition-colors duration-300 cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon name={icon} className={iconClassName} />
          <span className="text-sm font-medium text-primary">{identifier}</span>
        </div>
        <Badge label={badge} />
      </div>
      <h3 className="text-lg font-semibold text-on-surface mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">{excerpt}</p>
      <div className="flex items-center gap-4 text-xs text-on-surface-variant">
        {stats.map((stat, i) => (
          <span key={i} className="flex items-center gap-1">
            <Icon name={stat.icon} size={14} />
            {stat.value}
          </span>
        ))}
      </div>
    </article>
  );
}
