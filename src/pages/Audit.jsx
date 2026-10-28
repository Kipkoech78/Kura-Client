import React, { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';
import { Loading } from '../ui.jsx';

export default function Audit() {
  const [a, setA] = useState(null);
  useEffect(() => { api('/audit').then(setA); }, []);
  if (!a) return <Loading text="Loading audit log..." />;
  return (
    <div className="panel space-y-3">
      <div><h1 className="text-2xl font-extrabold text-white">Admin audit log</h1><p className="text-sm text-soft">Every admin action is recorded in a hash chain. Status: <b className={a.valid ? 'text-good' : 'text-bad'}>{a.valid ? 'intact' : 'TAMPERED'}</b>.</p></div>
      {!a.logs.length && <p className="text-soft">No admin actions yet.</p>}
      {a.logs.map((l) => <p key={l.hash} className="border-t border-line pt-2 text-sm"><b className="text-white">{l.action}</b> by {l.actor}: {l.detail}<br /><span className="text-xs text-soft">{fmt(l.at)}</span></p>)}
    </div>
  );
}
