import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Avatar } from '../ui.jsx';
import { useAuth } from '../auth.jsx';
import { Menu, Close } from './Icons.jsx';

const linkCls = ({ isActive }) => `block rounded-lg px-3 py-2 ${isActive ? 'bg-raise text-white' : 'text-soft hover:bg-raise/60 hover:text-white'}`;

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const links = (
    <>
      <NavLink to="/" end className={linkCls}>Elections</NavLink>
      {user && <NavLink to="/my-votes" className={linkCls}>My votes</NavLink>}
      {user?.role === 'admin' && <NavLink to="/admin" className={linkCls}>Admin</NavLink>}
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-night/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2 text-lg font-extrabold text-white">
            <img src="/kuraLogo.jfif" alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
            <span className="truncate">Company Vote</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 text-sm font-bold md:flex" aria-label="Main">
            {links}
            {user ? (
              <>
                <NavLink to="/profile" className="ml-2 flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-raise"><Avatar src={user.photoUrl} name={user.name} size={28} />{user.name.split(' ')[0]}</NavLink>
                <button onClick={logout} className="rounded-lg px-3 py-2 text-soft hover:text-white">Log out</button>
              </>
            ) : <NavLink to="/login" className="btn ml-2">Log in</NavLink>}
          </nav>

          <button type="button" className="ml-auto rounded-lg p-2 text-white hover:bg-raise md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
            {open ? <Close /> : <Menu />}
          </button>
        </div>

        {open && (
          <nav id="mobile-menu" aria-label="Mobile" className="space-y-1 border-t border-line px-4 pb-4 pt-2 text-sm font-bold md:hidden">
            {links}
            {user ? (
              <>
                <NavLink to="/profile" className={linkCls}><span className="flex items-center gap-2"><Avatar src={user.photoUrl} name={user.name} size={24} />Profile ({user.name.split(' ')[0]})</span></NavLink>
                <button onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left text-soft hover:bg-raise/60 hover:text-white">Log out</button>
              </>
            ) : <NavLink to="/login" className="btn mt-2 w-full">Log in</NavLink>}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-5xl space-y-5 p-4 pb-16"><Outlet /></main>
    </>
  );
}
