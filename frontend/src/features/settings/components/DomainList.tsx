import { useState } from 'react';

interface DomainListProps {
  domains: string[];
  onChange: (domains: string[]) => void;
}

export function DomainList({ domains, onChange }: DomainListProps) {
  const [newDomain, setNewDomain] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');

  function add() {
    const d = newDomain.trim().toLowerCase();
    if (d && !domains.includes(d)) {
      onChange([...domains, d]);
      setNewDomain('');
    }
  }

  function remove(i: number) {
    onChange(domains.filter((_, idx) => idx !== i));
  }

  function saveEdit(i: number) {
    const val = editVal.trim().toLowerCase();
    if (val) onChange(domains.map((d, idx) => (idx === i ? val : d)));
    setEditIdx(null);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="e.g. company.com" />
        <button type="button" onClick={add}
          className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
          Add Domain
        </button>
      </div>

      {domains.length === 0 ? (
        <p className="text-sm text-gray-400 italic py-4 text-center">No email domains added yet</p>
      ) : (
        <div className="border border-[#cccccc] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 w-12">Sr.No.</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Domain</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {domains.map((domain, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    {editIdx === i ? (
                      <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
                        onBlur={() => saveEdit(i)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(i)}
                        className="px-2 py-1 text-sm border border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full" />
                    ) : (
                      <span className="text-gray-700">{domain}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => { setEditIdx(i); setEditVal(domain); }}
                        className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => remove(i)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
