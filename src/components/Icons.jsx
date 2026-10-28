import React from 'react';

const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
export const Menu = () => <svg {...base}><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
export const Close = () => <svg {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const Dashboard = () => <svg {...base}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>;
export const Ballot = () => <svg {...base}><path d="M4 8h16v12H4z" /><path d="M9 8V4h6v4" /><path d="M9 14l2 2 4-4" /></svg>;
export const Plus = () => <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>;
export const Users = () => <svg {...base}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /><path d="M16 4.5a3.5 3.5 0 010 7M18 14.2c2 .7 3.5 2.6 3.5 5.8" /></svg>;
export const Voters = () => <svg {...base}><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>;
export const Shield = () => <svg {...base}><path d="M7 3h10l3 3v15H4V6z" /><path d="M8 11h8M8 15h8" /></svg>;
