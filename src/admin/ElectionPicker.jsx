import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';

// Lets the candidates and voters pages switch election; falls back to the live (or first) election
export function useElectionPick(base) {
  const { id } = useParams();
  const go = useNavigate();
  const [list, setList] = useState(null);
  useEffect(() => { api('/admin/elections').then(setList).catch(() => setList([])); }, []);
  const current = id || (list && (list.find((x) => x.status === 'voting') || list[0])?._id);
  const picker = list?.length > 0 && (
    <div><label className="label" htmlFor="pick">Election</label>
      <select id="pick" className="input sm:max-w-sm" value={current || ''} onChange={(ev) => go(`${base}/${ev.target.value}`)}>
        {list.map((x) => <option key={x._id} value={x._id}>{x.title}</option>)}
      </select></div>
  );
  return { id: current, list, picker };
}
