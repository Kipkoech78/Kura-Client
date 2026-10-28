import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt } from '../api.js';
import { Badge, Loading } from '../ui.jsx';

export default function Home() {
  const [list, setList] = useState(null);
  useEffect(() => { api('/elections').then(setList); }, []);
  return (
    <>
      <div><h1 className="text-3xl font-extrabold text-white">Elections</h1><p className="text-soft">Register, vote, and verify your ballot. Results appear only after voting closes.</p></div>
      {!list && <Loading text="Loading elections..." />}
      {list && !list.length && <div className="panel text-soft">No elections yet. An admin will schedule one soon.</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {list?.map((e) => (
          <Link key={e._id} to={`/election/${e._id}`} className="panel space-y-3 transition hover:border-brand">
            <div className="flex items-start justify-between gap-2"><h2 className="text-lg font-extrabold text-white">{e.title}</h2><Badge s={e.status} /></div>
            <p className="line-clamp-2 text-sm text-soft">{e.description}</p>
            <p className="text-xs text-soft">{e.seats} {e.seats === 1 ? 'seat' : 'seats'}. Voting: {fmt(e.voteStart)} to {fmt(e.voteEnd)}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
