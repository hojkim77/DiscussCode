import { Icon } from "./icon";

export interface DiscussionItemProps {
  icon: string;
  title: string;
  subtitle: string;
}

export function DiscussionItem({ icon, title, subtitle }: DiscussionItemProps) {
  return (
    <div className="flex gap-4 items-start cursor-pointer group">
      <div className="w-10 h-10 rounded bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-container transition-colors flex-shrink-0">
        <Icon name={icon} className="text-sm" />
      </div>
      <div>
        <h4 className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">
          {title}
        </h4>
        <p className="text-xs text-on-surface-variant mt-1">{subtitle}</p>
      </div>
    </div>
  );
}
