import React, { useState } from 'react';
import { api, fmt } from './api.js';

export const Err = ({ msg }) => msg ? <p role="alert" className="rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm font-semibold text-bad">{msg}</p> : null;
export const Ok = ({ msg }) => msg ? <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-sm font-semibold text-good">{msg}</p> : null;

const STATUS = { upcoming: 'Scheduled', registration: 'Registration open', waiting: 'Awaiting voting', voting: 'Voting open', closed: 'Results out' };
export const Badge = ({ s }) => (
  <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${s === 'voting' ? 'bg-gold text-night' : s === 'registration' ? 'bg-good text-night' : 'bg-raise text-soft'}`}>{STATUS[s] || s}</span>
);

export const Avatar = ({ src, name = '?', size = 40 }) => src
  ? <img src={src} alt={name} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover ring-2 ring-line" />
  : <span style={{ width: size, height: size, fontSize: size / 2.5 }} className="flex shrink-0 items-center justify-center rounded-full bg-raise font-extrabold text-brand ring-2 ring-line">{name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>;

export function PhotoUpload({ value, name, onChange, label = 'Photo' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setErr('');
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return setErr('Use a PNG, JPG or WebP image');
    if (file.size > 2 * 1024 * 1024) return setErr('Image must be under 2 MB');
    setBusy(true);
    try {
      const image = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(file); });
      onChange((await api('/upload', { method: 'POST', body: { image } })).url);
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-4">
        <Avatar src={value} name={name} size={72} />
        <label className="btn-alt cursor-pointer">{busy ? 'Uploading...' : value ? 'Change photo' : 'Upload photo'}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={pick} disabled={busy} /></label>
      </div>
      <p className="mt-1 text-xs text-soft">A clear face photo, PNG/JPG/WebP, under 2 MB.</p>
      <Err msg={err} />
    </div>
  );
}

// Registration -> Voting -> Results, with the real dates
export function Phases({ e, status }) {
  const at = { upcoming: -1, registration: 0, waiting: 0.5, voting: 1, closed: 2 }[status];
  const steps = [['Voter registration', `${fmt(e.regStart)} to ${fmt(e.regEnd)}`], ['Voting', `${fmt(e.voteStart)} to ${fmt(e.voteEnd)}`], ['Results published', fmt(e.voteEnd)]];
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map(([t, d], i) => {
        const done = at > i, now = Math.floor(at) === i && at >= 0 && !done;
        return (
          <li key={t} className={`rounded-xl border p-4 ${now ? 'border-gold bg-gold/10' : done ? 'border-good/40 bg-good/5' : 'border-line bg-surface'}`}>
            <p className={`text-sm font-extrabold ${now ? 'text-gold' : done ? 'text-good' : 'text-white'}`}>{t}{done ? ' (done)' : now ? ' (now)' : ''}</p>
            <p className="mt-1 text-xs text-soft">{d}</p>
          </li>
        );
      })}
    </ol>
  );
}
