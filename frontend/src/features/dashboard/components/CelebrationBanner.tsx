import { useEffect, useState, type CSSProperties } from 'react';
import { useCelebrations } from '../../../contexts/CelebrationsContext';
import { avatarUrl } from '../../../utils/avatarUrl';
import type { CelebrationEntry } from '../../../api/users.api';

const CONFETTI = ['🎊', '✨', '🎈', '🌟', '🎀', '💫', '🎁', '🥳'];

function FloatingParticle({ emoji, style }: { emoji: string; style: CSSProperties }) {
  return (
    <span
      className="pointer-events-none absolute select-none text-lg"
      style={{ animation: 'floatUp 4s ease-in-out infinite', ...style }}
    >
      {emoji}
    </span>
  );
}

function CelebrantChip({ entry }: { entry: CelebrationEntry }) {
  const src = avatarUrl(entry.user.profilePhoto);
  const initials = entry.user.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const isBirthday = entry.type === 'BIRTHDAY';

  const initialsDiv = (
    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-[9px] flex items-center justify-center font-bold ring-2 ring-white">
      {initials}
    </div>
  );

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm backdrop-blur-sm ${
      isBirthday
        ? 'bg-white/80 border-pink-200'
        : 'bg-white/80 border-purple-200'
    }`}>
      {src ? (
        <img
          src={src}
          alt={entry.user.fullName}
          className="w-6 h-6 rounded-full object-cover ring-2 ring-white"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
        />
      ) : null}
      <div className={src ? 'hidden' : ''}>{initialsDiv}</div>
      <span className="text-sm font-semibold text-gray-800">{entry.user.fullName}</span>
      {entry.type === 'ANNIVERSARY' && (
        <span className="text-xs font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">
          {entry.yearsCount}yr
        </span>
      )}
    </div>
  );
}

function BirthdaySection({ people }: { people: CelebrationEntry[] }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-3xl" style={{ animation: 'bounce 1s ease-in-out infinite' }}>🎂</span>
        <div>
          <p className="text-base font-bold text-pink-700 leading-tight">
            {people.length === 1
              ? `Happy Birthday, ${people[0].user.fullName.split(' ')[0]}!`
              : 'Happy Birthdays!'}
          </p>
          <p className="text-xs text-pink-500">
            {people.length === 1
              ? 'Wishing you a day as wonderful as you are! 🎉'
              : `${people.length} team members are celebrating today!`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {people.map((c) => <CelebrantChip key={c.user.id} entry={c} />)}
      </div>
    </div>
  );
}

function AnniversarySection({ people }: { people: CelebrationEntry[] }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-3xl" style={{ animation: 'bounce 1s ease-in-out infinite 0.3s' }}>🏆</span>
        <div>
          <p className="text-base font-bold text-purple-700 leading-tight">
            {people.length === 1
              ? `${people[0].yearsCount} Year${people[0].yearsCount !== 1 ? 's' : ''} & Going Strong, ${people[0].user.fullName.split(' ')[0]}!`
              : 'Work Anniversaries!'}
          </p>
          <p className="text-xs text-purple-500">
            {people.length === 1
              ? "Thank you for your dedication and passion. Here's to many more! 🌟"
              : 'Celebrating loyalty, dedication and years of excellence!'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {people.map((c) => <CelebrantChip key={c.user.id} entry={c} />)}
      </div>
    </div>
  );
}

export function CelebrationBanner() {
  const { celebrations } = useCelebrations();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (celebrations.length > 0) {
      const t = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(t);
    }
  }, [celebrations]);

  if (celebrations.length === 0) return null;

  const birthdays = celebrations.filter((c) => c.type === 'BIRTHDAY');
  const anniversaries = celebrations.filter((c) => c.type === 'ANNIVERSARY');

  const particles = Array.from({ length: 10 }, (_, i) => ({
    emoji: CONFETTI[i % CONFETTI.length],
    style: {
      left: `${8 + i * 9}%`,
      top: `${Math.random() * 60}%`,
      animationDelay: `${i * 0.4}s`,
      animationDuration: `${3 + (i % 3)}s`,
      opacity: 0.35,
      fontSize: i % 3 === 0 ? '1.2rem' : '0.9rem',
    } as CSSProperties,
  }));

  const gradientClass = birthdays.length > 0 && anniversaries.length > 0
    ? 'from-pink-400 via-yellow-300 to-purple-400'
    : birthdays.length > 0
      ? 'from-pink-400 via-rose-300 to-orange-300'
      : 'from-purple-400 via-indigo-400 to-blue-400';

  const innerGradient = birthdays.length > 0 && anniversaries.length > 0
    ? 'from-pink-50 via-yellow-50 to-purple-50'
    : birthdays.length > 0
      ? 'from-pink-50 via-rose-50 to-orange-50'
      : 'from-purple-50 via-indigo-50 to-blue-50';

  return (
    <>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50%  { transform: translateY(-12px) rotate(15deg); opacity: 0.5; }
          100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradientClass} p-px shadow-lg transition-all duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ animation: visible ? 'slideIn 0.4s ease-out forwards' : undefined }}
      >
        <div className={`relative rounded-[calc(1rem-1px)] bg-gradient-to-r ${innerGradient} px-6 py-4 overflow-hidden`}>

          {/* Floating particles */}
          {particles.map((p, i) => (
            <FloatingParticle key={i} emoji={p.emoji} style={p.style} />
          ))}

          {/* Shine sweep */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s linear infinite',
            }}
          />

          {/* Content */}
          <div className="relative flex flex-wrap gap-6 items-start">
            {birthdays.length > 0 && <BirthdaySection people={birthdays} />}

            {birthdays.length > 0 && anniversaries.length > 0 && (
              <div className="w-px self-stretch bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
            )}

            {anniversaries.length > 0 && <AnniversarySection people={anniversaries} />}
          </div>

          {/* Bottom tagline */}
          <p className="relative mt-3 text-[11px] text-gray-400 font-medium tracking-wide">
            🎗 Join us in making today extra special for our amazing team mate!
          </p>
        </div>
      </div>
    </>
  );
}
