import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Err, Avatar, Loading } from '../ui.jsx';
import { PageHeader } from './helpers.jsx';
import { useElectionPick } from './ElectionPicker.jsx';

export default function Voters() {
  const { id, list, picker } = useElectionPick('/admin/voters');
  const [voters, setVoters] = useState(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { if (!id) return; setVoters(null); setErr(''); api(`/admin/elections/${id}/voters`).then(setVoters).catch((x) => setErr(x.message)); }, [id]);
  if (!list) return <Loading text="Loading elections..." />;
  const s = q.trim().toLowerCase();
  const shown = voters?.filter((v) => !s || [v.name, v.email, v.employeeId, v.department].some((x) => String(x || '').toLowerCase().includes(s))) || [];
  return (
    <>
      <PageHeader title="Registered voters" sub="Admins can see which seats a person voted in, never who they voted for." />
      {picker}
      {!list.length && <div className="panel text-soft">No elections yet.</div>}
      <Err msg={err} />
      {list.length > 0 && !voters && !err && <Loading text="Loading voters..." />}
      {voters && (
        <div className="panel space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-white">{voters.length} registered</h2>
            <input className="input sm:max-w-xs" type="search" placeholder="Search name, email, ID or department" aria-label="Search voters" value={q} onChange={(ev) => setQ(ev.target.value)} />
          </div>
          {!shown.length && <p className="text-sm text-soft">{voters.length ? 'No voters match your search.' : 'Nobody has registered yet.'}</p>}
          {shown.length > 0 && (
            <>
              <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm">
                <thead className="text-xs text-soft"><tr><th className="py-2 pr-3">Voter</th><th className="pr-3">Employee ID</th><th className="pr-3">Department</th><th className="pr-3">Gender</th><th className="pr-3">Phone</th><th>Seats voted</th></tr></thead>
                <tbody>{shown.map((v) => (
                  <tr key={v.email} className="border-t border-line"><td className="py-2 pr-3"><span className="flex items-center gap-2"><Avatar src={v.photoUrl} name={v.name} size={32} /><span><b className="block text-white">{v.name}</b><span className="text-xs text-soft">{v.email}</span></span></span></td>
                    <td className="pr-3">{v.employeeId}</td><td className="pr-3">{v.department}</td><td className="pr-3 capitalize">{v.gender}</td><td className="pr-3">{v.phone}</td><td className={v.voted ? 'font-bold text-good' : 'text-soft'}>{v.voted} of {v.seats}</td></tr>
                ))}</tbody></table></div>
              <ul className="space-y-3 md:hidden">{shown.map((v) => (
                <li key={v.email} className="rounded-xl border border-line bg-night/40 p-3">
                  <div className="flex items-center gap-3"><Avatar src={v.photoUrl} name={v.name} size={40} /><div className="min-w-0"><b className="block truncate text-white">{v.name}</b><span className="block truncate text-xs text-soft">{v.email}</span></div>
                    <span className={`ml-auto whitespace-nowrap text-sm ${v.voted ? 'font-bold text-good' : 'text-soft'}`}>{v.voted} of {v.seats}</span></div>
                  <p className="mt-2 text-xs text-soft">ID {v.employeeId}. {v.department}. <span className="capitalize">{v.gender}</span>. {v.phone}</p>
                </li>
              ))}</ul>
            </>
          )}
        </div>
      )}
    </>
  );
}
