import { useCelebrations } from '../../../contexts/CelebrationsContext';
import { avatarUrl } from '../../../utils/avatarUrl';

export function CelebrationBanner() {
  const { celebrations } = useCelebrations();
  if (celebrations.length === 0) return null;

  const birthdays = celebrations.filter((c) => c.type === 'BIRTHDAY');
  const anniversaries = celebrations.filter((c) => c.type === 'ANNIVERSARY');

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-500 p-px shadow-lg">
      <div className="rounded-[calc(1rem-1px)] bg-gradient-to-r from-yellow-50 via-pink-50 to-purple-50 px-5 py-4">
        {/* Decorative dots */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          {['top-2 left-4', 'top-3 right-10', 'bottom-2 left-20', 'bottom-3 right-6'].map((pos, i) => (
            <span key={i} className={`absolute ${pos} text-lg opacity-30`}>✨</span>
          ))}
        </div>

        <div className="flex flex-wrap items-start gap-6">
          {birthdays.length > 0 && (
            <section className="flex items-start gap-3">
              <span className="text-3xl leading-none mt-0.5">🎂</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-pink-600 mb-1">Happy Birthday!</p>
                <div className="flex flex-wrap gap-2">
                  {birthdays.map((c) => (
                    <CelebrantChip key={c.user.id} entry={c} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {anniversaries.length > 0 && (
            <section className="flex items-start gap-3">
              <span className="text-3xl leading-none mt-0.5">🎉</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-1">Work Anniversary!</p>
                <div className="flex flex-wrap gap-2">
                  {anniversaries.map((c) => (
                    <CelebrantChip key={c.user.id} entry={c} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function CelebrantChip({ entry }: { entry: { user: { fullName: string; profilePhoto: string | null }; yearsCount: number; type: 'BIRTHDAY' | 'ANNIVERSARY' } }) {
  const src = avatarUrl(entry.user.profilePhoto);
  const initials = entry.user.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-1.5 bg-white/70 border border-white rounded-full px-2.5 py-1 shadow-sm">
      {src ? (
        <img src={src} alt={entry.user.fullName} className="w-5 h-5 rounded-full object-cover" />
      ) : (
        <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-[8px] flex items-center justify-center font-semibold">
          {initials}
        </div>
      )}
      <span className="text-sm font-medium text-gray-800">{entry.user.fullName}</span>
      {entry.type === 'ANNIVERSARY' && (
        <span className="text-xs text-purple-600 font-semibold">{entry.yearsCount}yr</span>
      )}
    </div>
  );
}
