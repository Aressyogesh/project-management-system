import { TYPE_CONFIG, type WorkItemType } from '../types/board.types';

interface Props {
  type: WorkItemType;
  className?: string;
}

export function TypeBadge({ type, className = '' }: Props) {
  const cfg = TYPE_CONFIG[type];
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.bg} ${cfg.text} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
