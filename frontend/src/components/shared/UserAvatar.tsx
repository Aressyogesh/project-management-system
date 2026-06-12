import { useState } from 'react';
import { avatarUrl } from '../../utils/avatarUrl';

type AvatarSize = 'xs' | 'sm' | 'md' | 'card' | 'lg';

// All size strings are written out in full so Tailwind JIT includes them
const SIZE_MAP: Record<AvatarSize, { wrap: string; text: string }> = {
  xs:   { wrap: 'w-5 h-5',  text: 'text-[8px]' },
  sm:   { wrap: 'w-7 h-7',  text: 'text-[10px]' },
  card: { wrap: 'w-6 h-6',  text: 'text-[9px]' },
  md:   { wrap: 'w-8 h-8',  text: 'text-xs' },
  lg:   { wrap: 'w-9 h-9',  text: 'text-sm' },
};

interface Props {
  name: string;
  photo?: string | null;
  size?: AvatarSize;
  className?: string;
  title?: string;
}

export function UserAvatar({ name, photo, size = 'md', className = '', title }: Props) {
  const [failed, setFailed] = useState(false);
  const src = avatarUrl(photo);
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const { wrap, text } = SIZE_MAP[size];

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        title={title}
        className={`${wrap} rounded-full object-cover shrink-0 ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      title={title ?? name}
      className={`${wrap} ${text} rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
}
