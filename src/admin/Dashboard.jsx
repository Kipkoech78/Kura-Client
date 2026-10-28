import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Err, Badge, Loading } from '../ui.jsx';
import { PageHeader } from './helpers.jsx';

const Stat = ({ label, value, to, accent }) => (
  <Link to={to} className="panel block transition hover:border-brand">
    <p className="text-xs font-bold uppercase tracking-wide text-soft">{label}</p>
    <p className={`mt-1 text-3xl font-extrabold ${accent || 'text-white'}`}>{value}</p>
  </Link>
);

export default function Dashboard() {
  const [list, setList] = useState(null);
  const [extra, setExtra] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/admin/elections').then(setList).catch((x) => setErr(x.message)); }, []);

  // The election that matters most right now: live voting, then registration, then anything not finished
  const feat = list && (list.find((e) => e.status === 'voting') || list.find((e) => e.status === 'registration') || list.find((e) => e.status !== 'closed') || list[0]);
  useEffect(() => {
    if (!feat) return;
    setExtra(null);
    Promise.all([api(`/admin/elections/${feat._id}/voters`), api(`/admin/elections/${feat._id}/tally`)]).then(([voters, tally]) => setExtra({ voters, tally })).catch(() => {});
  }, [feat?._id]);

  if (!list) return err ? <Err msg={err} /> : <Loading text="Loading dashboard..." />;
  const pending = list.reduce((n, e) => n + (e.pending || 0), 0);
  const live = list.filter((e) => e.status === 'voting').length;
  const open = list.filter((e) => e.candidatesOpen).length;
  const voted = extra?.voters.filter((v) => v.voted > 0).length;
  const reg = extra?.voters.length;

  return (
    <>
      <PageHeader title="Dashboard" sub="What needs your attention across all elections."><Link to="/admin/elections/new" className="btn">New election</Link></PageHeader>
      <Err msg={err} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Elections" value={list.length} to="/admin/elections" />
        <Stat label="Voting now" value={live} to="/admin/elections" accent={live ? 'text-gold' : ''} />
        <Stat label="Awaiting review" value={pending} to="/admin/candidates" accent={pending ? 'text-gold' : ''} />
        <Stat label="Applications open" value={open} to="/admin/candidates" />
      </div>

      {feat && (
        <div className="panel space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><p className="text-xs font-bold uppercase tracking-wide text-soft">Current focus</p><Link to={`/admin/elections/${feat._id}`} className="text-xl font-extrabold text-white hover:text-brand">{feat.title}</Link></div>
            <Badge s={feat.status} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-night/40 p-3"><p className="text-2xl font-extrabold text-white">{feat.seats}</p><p className="text-xs text-soft">Seats</p></div>
            <div className="rounded-xl bg-night/40 p-3"><p className="text-2xl font-extrabold text-white">{reg ?? '-'}</p><p className="text-xs text-soft">Registered voters</p></div>
            <div className="rounded-xl bg-night/40 p-3"><p className="text-2xl font-extrabold text-white">{reg ? `${Math.round((voted / reg) * 100)}%` : '-'}</p><p className="text-xs text-soft">Voted in at least one seat</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/admin/candidates/${feat._id}`} className="btn-alt">Candidates{feat.pending > 0 ? ` (${feat.pending} to review)` : ''}</Link>
            <Link to={`/admin/voters/${feat._id}`} className="btn-alt">Voters</Link>
            <Link to={`/admin/elections/${feat._id}/edit`} className="btn-alt">Edit</Link>
          </div>
        </div>
      )}

      <div className="panel space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold text-white">All elections</h2><Link to="/admin/elections" className="text-sm font-bold text-brand">See all</Link></div>
        {!list.length && <p className="text-soft">No elections yet. Create one to get started.</p>}
        {list.slice(0, 5).map((e) => (
          <Link key={e._id} to={`/admin/elections/${e._id}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 first:border-0 first:pt-0 hover:text-brand">
            <span className="min-w-0 truncate font-bold text-white">{e.title}</span>
            <span className="flex items-center gap-2">{e.pending > 0 && <span className="text-xs font-bold text-gold">{e.pending} to review</span>}<Badge s={e.status} /></span>
          </Link>
        ))}
      </div>
    </>
  );
}
