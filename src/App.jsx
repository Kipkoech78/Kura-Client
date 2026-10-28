import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import Election from './pages/Election.jsx';
import Apply from './pages/Apply.jsx';
import MyVotes from './pages/MyVotes.jsx';
import Audit from './pages/Audit.jsx';
import Dashboard from './admin/Dashboard.jsx';
import Elections from './admin/Elections.jsx';
import CreateElection from './admin/CreateElection.jsx';
import ElectionDetail from './admin/ElectionDetail.jsx';
import EditElection from './admin/EditElection.jsx';
import Candidates from './admin/Candidates.jsx';
import Voters from './admin/Voters.jsx';

function AppRoutes() {
  const { user } = useAuth();
  const authed = (el) => (user ? el : <Navigate to="/login" replace />);
  const admin = (el) => (user?.role === 'admin' ? el : <Navigate to="/login" replace />);
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={authed(<Profile />)} />
        <Route path="/election/:id" element={<Election />} />
        <Route path="/apply/:code" element={<Apply />} />
        <Route path="/my-votes" element={authed(<MyVotes />)} />
        <Route path="/audit" element={<Audit />} />
      </Route>

      <Route path="/admin" element={admin(<AdminLayout />)}>
        <Route index element={<Dashboard />} />
        <Route path="elections" element={<Elections />} />
        <Route path="elections/new" element={<CreateElection />} />
        <Route path="elections/:id" element={<ElectionDetail />} />
        <Route path="elections/:id/edit" element={<EditElection />} />
        <Route path="candidates/:id?" element={<Candidates />} />
        <Route path="voters/:id?" element={<Voters />} />
        <Route path="audit" element={<Audit />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
