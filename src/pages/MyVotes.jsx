import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Badge, Loading } from '../ui.jsx';
import { useAuth } from '../auth.jsx';
import { SEAT, forWho, canJoin } from '../shared.jsx';
import Tracker from './Tracker.jsx';

export default function MyVotes() {
  const [list, setList] = useState(null);
  useEffect(() => { api('/me/elections').then(setList); }, []);
  return (
    <>
      <div><h1 className="text-3xl font-extrabold text-white">My votes</h1><p className="text-soft">Follow every ballot you cast, seat by seat, from voting to the final count.</p></div>
      {!list && <Loading text="Loading your elections..." />}
      {list && !list.length && <div className="panel text-soft">You have not registered for any election yet. <Link to="/" className="font-bold text-brand underline">Browse elections</Link></div>}
      {list?.map((x) => <MyElection key={x.id} x={x} />)}
    </>
  );
}

function MyElection({ x }) {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  useEffect(() => { api(`/elections/${x.id}`).then(setD); }, [x.id]);
  const seats = d?.positions.filter((p) => canJoin(p, user.gender)) || [];
  return (
    <div className="panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><Link to={`/election/${x.id}`} className="text-lg font-extrabold text-white hover:text-brand">{x.title}</Link><Badge s={x.status} /></div>
      <p className="text-sm text-soft">Voted in {x.voted} of {x.seats} seats you can vote for.</p>
      {!d && <Loading text="Loading seats..." />}
      {seats.map((p) => (
        <div key={p.id} className="space-y-2"><div className="flex items-center gap-2"><h3 className="font-bold text-white">{p.title}</h3>{forWho(p.eligible)}<span className="text-xs text-soft">{SEAT[p.status]}</span></div>
          <Tracker pid={p.id} voted={!!d.me?.voted?.[p.id]} closed={d.status === 'closed'} cands={p.candidates} /></div>
      ))}
    </div>
  );
}
