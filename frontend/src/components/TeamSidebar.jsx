import { useState } from 'react';
import api from '../api';

export default function TeamSidebar({ teams, selectedId, onSelect, members, user, onTeamCreated, onMemberAdded }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState({ text: '', ok: true });

  const selected = teams.find((t) => String(t.id) === String(selectedId));
  const isOwner = selected && selected.created_by === user.id;
  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500';

  const createTeam = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/teams', { name });
      setName('');
      setMsg({ text: '', ok: true });
      onTeamCreated(data);
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Could not create team', ok: false });
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/teams/${selectedId}/members`, { email });
      setEmail('');
      setMsg({ text: 'Member added', ok: true });
      onMemberAdded();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Could not add member', ok: false });
    }
  };

  const tab = (active) =>
    `block w-full rounded-lg px-3 py-2 text-left text-sm ${
      active ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'
    }`;

  return (
    <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="mb-2 font-semibold text-slate-800">Teams</h2>
        <button onClick={() => onSelect('')} className={tab(!selectedId)}>
          All teams
        </button>
        {teams.map((t) => (
          <button key={t.id} onClick={() => onSelect(String(t.id))} className={tab(String(t.id) === String(selectedId))}>
            {t.name}
          </button>
        ))}
      </div>

      <form onSubmit={createTeam} className="space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New team name" className={input} required minLength={2} maxLength={100} />
        <button className="w-full rounded-lg bg-slate-800 py-2 text-sm text-white hover:bg-slate-700">Create team</button>
      </form>

      {selected && (
        <div className="space-y-2 border-t pt-3">
          <h3 className="text-sm font-semibold text-slate-800">Members of {selected.name}</h3>
          <ul className="space-y-1 text-sm text-slate-600">
            {members.map((m) => (
              <li key={m.id}>
                {m.name} <span className="text-xs text-slate-400">({m.email})</span>
              </li>
            ))}
          </ul>
          {isOwner && (
            <form onSubmit={addMember} className="space-y-2">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Member email" className={input} required />
              <button className="w-full rounded-lg border border-indigo-600 py-2 text-sm text-indigo-600 hover:bg-indigo-50">
                Add member
              </button>
            </form>
          )}
        </div>
      )}

      {msg.text && <p className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
    </div>
  );
}