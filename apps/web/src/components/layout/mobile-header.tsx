import { Icon } from "../ui/icon";

export function MobileHeader() {
  return (
    <header className="md:hidden w-full top-0 sticky z-50 bg-background border-b border-surface-container-low">
      <div className="flex justify-between items-center px-6 py-4">
        <span className="text-2xl font-semibold tracking-tighter text-primary">
          DiscussCode
        </span>
        <div className="flex items-center gap-4 text-primary">
          <Icon name="notifications" className="cursor-pointer active:scale-95 duration-200" />
          <div className="w-8 h-8 rounded-full bg-surface-container-high" />
        </div>
      </div>
    </header>
  );
}
