import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { businessUnitsApi } from '../../../api/businessUnits.api';
import { departmentsApi } from '../../../api/departments.api';
import { clientsApi } from '../../../api/clients.api';
import { usersApi } from '../../../api/users.api';
import { UserAvatar } from '../../../components/shared/UserAvatar';
import type { BusinessUnit } from '../../../types/businessUnit.types';
import type { Department, User } from '../../../types/users.types';
import type { Client } from '../../../types/clients.types';

const ROLE_LABELS: Record<string, string> = {
  SUPER_USER: 'Super User',
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee',
};

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 shrink-0 ${open ? 'rotate-90' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function IconBU() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconDept() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function IconClient() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

// ── Highlight ──────────────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-gray-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── User row ───────────────────────────────────────────────────────────────────

function UserRow({ user, query }: { user: User; query: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <UserAvatar name={user.fullName} photo={user.profilePhoto} className="w-7 h-7 text-xs shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="text-sm text-gray-800 font-medium">
          <Highlight text={user.fullName} query={query} />
        </span>
        <span className="text-xs text-gray-400 ml-2">{ROLE_LABELS[user.systemRole] ?? user.systemRole}</span>
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
        {user.isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
}

// ── Department node ────────────────────────────────────────────────────────────

function DeptNode({ dept, users, query, forceOpen }: { dept: Department; users: User[]; query: string; forceOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50/60 hover:bg-gray-100/60 transition-colors text-left"
      >
        <IconChevron open={isOpen} />
        <IconDept />
        <span className="text-sm font-medium text-gray-700 flex-1">
          <Highlight text={dept.name} query={query} />
        </span>
        <span className="text-xs text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
          {users.length} user{users.length !== 1 ? 's' : ''}
        </span>
        {!dept.isActive && (
          <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Inactive</span>
        )}
      </button>
      {isOpen && (
        <div className="px-3 py-2 bg-white">
          {users.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-1 px-3">No users in this department</p>
          ) : (
            users.map((u) => <UserRow key={u.id} user={u} query={query} />)
          )}
        </div>
      )}
    </div>
  );
}

// ── Client row ─────────────────────────────────────────────────────────────────

function ClientRow({ client, query }: { client: Client; query: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 px-4 hover:bg-gray-50 transition-colors">
      <IconClient />
      <div className="min-w-0 flex-1">
        <span className="text-sm text-gray-700 font-medium">
          <Highlight text={client.name} query={query} />
        </span>
        {client.contactPerson && (
          <span className="text-xs text-gray-400 ml-2">{client.contactPerson}</span>
        )}
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${client.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
        {client.isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
}

// ── BU node ────────────────────────────────────────────────────────────────────

interface OrgBU {
  bu: BusinessUnit;
  departments: { dept: Department; users: User[] }[];
  clients: Client[];
}

function BUNode({ node, query, forceOpen }: { node: OrgBU; forceOpen: boolean; query: string }) {
  const [open, setOpen] = useState(true);
  const isOpen = forceOpen || open;

  const totalUsers = node.departments.reduce((s, d) => s + d.users.length, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* BU header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-gray-900 text-left hover:bg-gray-800 transition-colors"
      >
        <IconChevron open={isOpen} />
        <IconBU />
        <span className="text-sm font-semibold text-white flex-1">
          <Highlight text={node.bu.name} query={query} />
        </span>
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <span>{node.departments.length} dept{node.departments.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{totalUsers} user{totalUsers !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{node.clients.length} client{node.clients.length !== 1 ? 's' : ''}</span>
        </div>
        {!node.bu.isActive && (
          <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded-full ml-1">Inactive</span>
        )}
      </button>

      {isOpen && (
        <div className="divide-y divide-gray-50">
          {/* Departments section */}
          {node.departments.length > 0 && (
            <div className="px-5 py-4 space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Departments ({node.departments.length})
              </p>
              {node.departments.map(({ dept, users }) => (
                <DeptNode key={dept.id} dept={dept} users={users} query={query} forceOpen={!!query} />
              ))}
            </div>
          )}

          {/* Clients section */}
          {node.clients.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Clients ({node.clients.length})
              </p>
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                {node.clients.map((c) => (
                  <ClientRow key={c.id} client={c} query={query} />
                ))}
              </div>
            </div>
          )}

          {node.departments.length === 0 && node.clients.length === 0 && (
            <p className="px-5 py-4 text-xs text-gray-400 italic">No departments or clients assigned.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function OrgStructurePage() {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const { data: busRaw = [], isLoading: buLoading } = useQuery({
    queryKey: ['business-units-all'],
    queryFn: () => businessUnitsApi.list(true),
    staleTime: 120_000,
  });

  const { data: deptsRaw = [], isLoading: deptLoading } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => departmentsApi.list(true),
    staleTime: 120_000,
  });

  const { data: clientsRaw = [], isLoading: clientLoading } = useQuery({
    queryKey: ['clients-all'],
    queryFn: () => clientsApi.list(true),
    staleTime: 120_000,
  });

  const { data: usersData, isLoading: userLoading } = useQuery({
    queryKey: ['users-all-org'],
    queryFn: () => usersApi.list({ page: 1, limit: 1000 }),
    staleTime: 120_000,
  });

  const usersRaw = usersData?.data ?? [];
  const isLoading = buLoading || deptLoading || clientLoading || userLoading;

  // Build tree
  const tree = useMemo<OrgBU[]>(() => {
    return busRaw.map((bu) => {
      const depts = deptsRaw.filter((d) => d.businessUnit?.id === bu.id);
      const clients = clientsRaw.filter((c) => c.businessUnit?.id === bu.id);
      return {
        bu,
        departments: depts.map((dept) => ({
          dept,
          users: usersRaw.filter((u) => u.department?.id === dept.id),
        })),
        clients,
      };
    });
  }, [busRaw, deptsRaw, clientsRaw, usersRaw]);

  // Unassigned groups
  const unassignedDepts = useMemo(
    () => deptsRaw.filter((d) => !d.businessUnit),
    [deptsRaw],
  );
  const unassignedClients = useMemo(
    () => clientsRaw.filter((c) => !c.businessUnit),
    [clientsRaw],
  );
  const unassignedUsers = useMemo(
    () => usersRaw.filter((u) => !u.department),
    [usersRaw],
  );

  // Filter tree when searching
  const visibleTree = useMemo<OrgBU[]>(() => {
    if (!q) return tree;
    return tree
      .map((node) => {
        const buMatch = node.bu.name.toLowerCase().includes(q);
        const filteredDepts = node.departments.filter(({ dept, users }) =>
          dept.name.toLowerCase().includes(q) || users.some((u) => u.fullName.toLowerCase().includes(q))
        );
        const filteredClients = node.clients.filter((c) => c.name.toLowerCase().includes(q) || c.contactPerson.toLowerCase().includes(q));
        if (buMatch || filteredDepts.length || filteredClients.length) {
          return {
            ...node,
            departments: buMatch ? node.departments : filteredDepts,
            clients: buMatch ? node.clients : filteredClients,
          };
        }
        return null;
      })
      .filter(Boolean) as OrgBU[];
  }, [tree, q]);

  const totalUsers = usersData?.total ?? 0;
  const loadedUsers = usersRaw.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Organisation Structure</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {busRaw.length} business units · {deptsRaw.length} departments · {clientsRaw.length} clients · {totalUsers} users
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search BU, department, client or user…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Warning if users were truncated */}
          {loadedUsers < totalUsers && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
              Showing {loadedUsers} of {totalUsers} users. Some users may not appear in the tree.
            </div>
          )}

          {/* No results */}
          {q && visibleTree.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-sm text-gray-400">
              No results for "<span className="font-medium text-gray-600">{search}</span>"
            </div>
          ) : (
            <div className="space-y-4">
              {visibleTree.map((node) => (
                <BUNode key={node.bu.id} node={node} query={q} forceOpen={!!q} />
              ))}

              {/* Unassigned section */}
              {!q && (unassignedDepts.length > 0 || unassignedClients.length > 0 || unassignedUsers.length > 0) && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-500">Unassigned</p>
                    <p className="text-xs text-gray-400 mt-0.5">Not linked to any Business Unit</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {unassignedDepts.length > 0 && (
                      <div className="px-5 py-4 space-y-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Departments</p>
                        {unassignedDepts.map((dept) => (
                          <DeptNode
                            key={dept.id}
                            dept={dept}
                            users={usersRaw.filter((u) => u.department?.id === dept.id)}
                            query=""
                            forceOpen={false}
                          />
                        ))}
                      </div>
                    )}
                    {unassignedClients.length > 0 && (
                      <div className="px-5 py-4">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Clients</p>
                        <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                          {unassignedClients.map((c) => <ClientRow key={c.id} client={c} query="" />)}
                        </div>
                      </div>
                    )}
                    {unassignedUsers.length > 0 && (
                      <div className="px-5 py-4">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Users without department</p>
                        {unassignedUsers.map((u) => <UserRow key={u.id} user={u} query="" />)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
