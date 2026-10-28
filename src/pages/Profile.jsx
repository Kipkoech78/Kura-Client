import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { Err, Ok, Btn, PhotoUpload, useBusy } from '../ui.jsx';
import { useAuth } from '../auth.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
const location = useLocation();

const params = new URLSearchParams(location.search);
const next = params.get('next') || '/';

  const [f, setF] = useState({
    name: user.name,
    phone: user.phone,
    employeeId: user.employeeId,
    department: user.department,
    gender: user.gender || '',
    photoUrl: user.photoUrl
  });

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, run] = useBusy();

  const set = (k) => (e) =>
    setF({ ...f, [k]: e.target.value });

  
const save = (e) => {
  e.preventDefault();
  setErr('');
  setMsg('');

  return run(async () => {
    try {
      const updatedUser = await api('/me/profile', {
        method: 'PUT',
        body: f
      });

      setUser(updatedUser);

      // Return to the original destination after saving the profile.
      navigate(next, { replace: true });
    } catch (x) {
      setErr(x.message);
    }
  });
};


  const field = (k, label, props = {}) => (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      <input
        id={k}
        className="input"
        required
        value={f[k]}
        onChange={set(k)}
        {...props}
      />
    </div>
  );

  return (
    <form onSubmit={save} className="panel mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-white">
          Your voter profile
        </h1>
        <p className="text-sm text-soft">
          Fill this in once. It is used for every election, so registering later takes one click.
        </p>
      </div>

      <PhotoUpload
        value={f.photoUrl}
        name={f.name}
        onChange={(photoUrl) => setF({ ...f, photoUrl })}
        label="Profile photo (optional for voters)"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {field('name', 'Full name')}

        <div>
          <label className="label">Work email</label>
          <input className="input opacity-60" value={user.email} disabled />
        </div>

        {field('phone', 'Phone number', { type: 'tel' })}
        {field('employeeId', 'Employee ID')}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field('department', 'Department')}

        <div>
          <label className="label" htmlFor="gender">Gender</label>
          <select
            id="gender"
            className="input"
            required
            value={f.gender}
            onChange={set('gender')}
          >
            <option value="">Select</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other / prefer not to say</option>
          </select>

          <p className="mt-1 text-xs text-soft">
            Used only for gender-specific seats, such as hostel captains.
          </p>
        </div>
      </div>

      <Err msg={err} />
      <Ok msg={msg} />

      <Btn busy={busy}>
        {busy ? 'Saving...' : 'Save profile'}
      </Btn>
    </form>
  );
}
