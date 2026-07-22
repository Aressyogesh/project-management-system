import { useEffect, useRef, useState } from 'react';

interface Option { id: string; name: string; }

interface FilterComboboxProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export function FilterCombobox({ options, value, onChange, placeholder = 'All', loading = false }: FilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedName = options.find((o) => o.id === value)?.name ?? '';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  const displayValue = open ? search : (selectedName || '');

  return (
    <div ref={containerRef} className="relative min-w-[180px]">
      <div className="flex items-center gap-1.5 h-[38px] px-3 border border-gray-200 rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
        </svg>
        <input
          type="text"
          value={displayValue}
          placeholder={loading ? 'Loading…' : placeholder}
          disabled={loading}
          onFocus={() => { setOpen(true); setSearch(''); }}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-gray-400 min-w-0"
        />
        {value && !open ? (
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange(''); setSearch(''); }}
            className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
            title="Clear filter"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : !open ? (
          <svg className="w-3.5 h-3.5 text-gray-300 shrink-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : null}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-auto">
          <div
            onMouseDown={() => { onChange(''); setSearch(''); setOpen(false); }}
            className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${!value ? 'text-primary-600 font-medium' : 'text-gray-400'}`}
          >
            {placeholder}
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400 italic">No matches</div>
          ) : (
            filtered.map((o) => (
              <div
                key={o.id}
                onMouseDown={() => { onChange(o.id); setSearch(''); setOpen(false); }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 hover:text-primary-700 ${value === o.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'}`}
              >
                {o.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
