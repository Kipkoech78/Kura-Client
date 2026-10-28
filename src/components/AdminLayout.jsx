import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Avatar } from '../ui.jsx';
import { useAuth } from '../auth.jsx';
import * as I from './Icons.jsx';

const NAV = [
  ['/admin', 'Dashboard', I.Dashboard, (p) => p === '/admin'],
  ['/admin/elections', 'Elections', I.Ballot, (p) => p.startsWith('/admin/elections') && p !== '/admin/elections/new'],
  ['/admin/elections/new', 'Create election', I.Plus, (p) => p === '/admin/elections/new'],
  ['/admin/candidates', 'Candidates', I.Users, (p) => p.startsWith('/admin/candidates')],
  ['/admin/voters', 'Voters', I.Voters, (p) => p.startsWith('/admin/voters')],
  ['/admin/audit', 'Audit log', I.Shield, (p) => p.startsWith('/admin/audit')],
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const current = NAV.find(([, , , m]) => m(pathname));

  return (
    <div className="min-h-screen lg:flex">
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside id="admin-nav" aria-label="Admin" className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-line bg-surface transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between gap-2 border-b border-line p-4">
          <Link to="/admin" className="flex min-w-0 items-center gap-2 font-extrabold text-white">
            <img src="/kuraLogo.jfif" alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
            <span className="truncate">Admin panel</span>
          </Link>
          <button type="button" className="rounded-lg p-1.5 text-soft hover:bg-raise hover:text-white lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><I.Close /></button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3 text-sm font-bold">
          {NAV.map(([to, label, Icon, match]) => (
            <Link key={to} to={to} aria-current={match(pathname) ? 'page' : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${match(pathname) ? 'bg-raise text-white' : 'text-soft hover:bg-raise/60 hover:text-white'}`}><Icon />{label}</Link>
          ))}
        </nav>

        <div className="space-y-2 border-t border-line p-3 text-sm font-bold">
          <div className="flex items-center gap-2 px-2 py-1"><Avatar src={user.photoUrl} name={user.name} size={28} /><span className="truncate text-white">{user.name}</span></div>
          <Link to="/" className="block rounded-lg px-3 py-2 text-soft hover:bg-raise/60 hover:text-white">View voter site</Link>
          <button onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left text-soft hover:bg-raise/60 hover:text-white">Log out</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-night/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" className="rounded-lg p-2 text-white hover:bg-raise" aria-label="Open menu" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen(true)}><I.Menu /></button>
          <span className="truncate font-extrabold text-white">{current?.[1] || 'Admin'}</span>
        </header>
        <main className="mx-auto max-w-5xl space-y-5 p-4 pb-16 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
