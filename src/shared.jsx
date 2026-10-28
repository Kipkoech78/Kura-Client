import React from 'react';

export const SEAT = { upcoming: 'Scheduled', open: 'Voting open', closed: 'Closed' };
export const forWho = (el) => (el === 'any' ? null : <span className="rounded-full border border-gold/50 px-2 py-0.5 text-xs font-bold text-gold">{el === 'female' ? 'Female only' : 'Male only'}</span>);
export const canJoin = (p, gender) => p.eligible === 'any' || p.eligible === gender;
