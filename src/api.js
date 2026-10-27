const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(BASE + path, {
    method, body: body && JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
export const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
export async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const API_ORIGIN = window.location.origin;
export const getReceipts = () => JSON.parse(localStorage.getItem('receipts') || '{}');
export const saveReceipt = (id, hash) => localStorage.setItem('receipts', JSON.stringify({ ...getReceipts(), [id]: hash }));
