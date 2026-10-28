import React, { useEffect, useState } from 'react';
import { api, getReceipts } from '../api.js';
import { Spinner } from '../ui.jsx';

// Follows one ballot (one seat) from casting to the final count, using only the voter's own receipt
export default function Tracker({ pid, voted, closed, cands }) {
  const [ledger, setLedger] = useState(null);
  const receipt = getReceipts()[pid];
  useEffect(() => { api(`/positions/${pid}/ledger`).then(setLedger); }, [pid, voted, closed]);
  const entry = receipt && ledger?.ballots.find((b) => b.hash === receipt);
  const choice = closed && entry && (entry.candidateId === 'abstain' ? 'Abstained' : cands.find((c) => c.id === entry.candidateId)?.name);
  const stages = [
    ['Ballot cast', voted, voted ? 'The server marked you as voted for this seat. You cannot vote twice.' : 'Waiting for you to vote.'],
    ['Recorded in the public ledger', !!entry, entry ? `Your ballot is #${entry.index + 1} in this seat's chain.` : voted && !receipt ? 'No receipt on this device. Check your email and paste it into the ledger search.' : 'Appears after you vote.'],
    ['Counted in the final result', closed && !!entry && ledger.valid, closed ? (entry ? `Your ballot shows: ${choice || 'unknown'}. Chain verified: ${ledger.valid ? 'yes' : 'NO'}.` : 'Your ballot was not found.') : 'Shown when the election ends.'],
  ];
  return (
    <ol className="space-y-2 rounded-xl border border-line bg-night/40 p-4">
      <h3 className="font-extrabold text-white">Track your vote</h3>
      {!ledger && <p className="flex items-center gap-2 text-xs text-soft"><Spinner /> Checking the public ledger...</p>}
      {stages.map(([t, ok, note]) => (
        <li key={t} className="flex gap-3"><span aria-hidden className={`mt-1 h-3 w-3 shrink-0 rounded-full ${ok ? 'bg-good' : 'bg-line'}`} /><div><p className={`text-sm font-bold ${ok ? 'text-white' : 'text-soft'}`}>{t}</p><p className="text-xs text-soft">{note}</p></div></li>
      ))}
    </ol>
  );
}
