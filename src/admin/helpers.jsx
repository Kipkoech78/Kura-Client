import React from 'react';

export const iso = (v) => v && new Date(v).toISOString();
export const toLocal = (v) => { const d = new Date(v); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const EL = { any: 'Everyone', female: 'Female only', male: 'Male only' };
export const tag = (el) => el !== 'any' && <span className="rounded-full border border-gold/50 px-2 py-0.5 text-xs font-bold text-gold">{EL[el]}</span>;

export const PageHeader = ({ title, sub, children }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0"><h1 className="text-2xl font-extrabold text-white sm:text-3xl">{title}</h1>{sub && <p className="text-soft">{sub}</p>}</div>
    {children && <div className="flex flex-wrap gap-2">{children}</div>}
  </div>
);
// Lowest seat first: the order here is the order the seats are voted in
export const PRESETS = {
  University: [['Sports Council Member', 'any'], ['Hostel Council Member', 'any'], ['Hostel Captain (Female)', 'female'], ['Hostel Captain (Male)', 'male'], ['President', 'any']],
  Company: [['Head of HR', 'any'], ['Head of Finance', 'any'], ['Head of Marketing', 'any'], ['Head of ICT', 'any']],
};
export const seat = ([title, eligible]) => ({ title, eligible });
export const blank = { title: '', description: '', regStart: '', regEnd: '', voteStart: '', voteEnd: '', positions: [{ title: '', eligible: 'any' }] };
