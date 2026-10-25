import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import TeamSidebar from '../components/TeamSidebar';
import TaskModal from '../components/TaskModal';

const STATUS_LABEL = { todo: 'To do', in_progress: 'In progress', done: 'Done' };
const STATUS_STYLE = {
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-green-100 text-green-700',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null or { task: object | null }
  const [menuOpen, setMenuOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const [memberReload, setMemberReload] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/teams').then((r) => setTeams(r.data)).catch(() => setError('Could not load teams'));
  }, []);

  useEffect(() => {
    if (!teamId) return setMembers([]);
    api.get(`/teams/${teamId}/members`).then((r) => setMembers(r.data)).catch(() => setMembers([]));
  }, [teamId, memberReload]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = {};
      if (teamId) params.team_id = teamId;
      if (assigneeId) params.assignee_id = assigneeId;
      if (search.trim()) params.search = search.trim();
      api
        .get('/tasks', { params })
        .then((r) => {
          setTasks(r.data);
          setError('');
        })
        .catch(() => setError('Could not load tasks'));
    }, 250);
    return () => clearTimeout(timer);
  }, [teamId, assigneeId, search, reload]);

  const selectTeam = (id) => {
    setTeamId(id);
    setAssigneeId('');
    setMenuOpen(false);
  };

  const deleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete task');
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const field = 'rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500';

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded border border-slate-300 px-3 py-1 text-sm md:hidden"
          >
            Teams
          </button>
          <h1 className="text-lg font-bold text-indigo-600">Team Task Manager</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-600 sm:inline">{user.name}</span>
          <button onClick={logout} className="rounded bg-slate-800 px-3 py-1.5 text-white hover:bg-slate-700">
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 md:flex-row">
        <aside className={`${menuOpen ? 'block' : 'hidden'} md:block md:w-72 md:shrink-0`}>
          <TeamSidebar
            teams={teams}
            selectedId={teamId}
            onSelect={selectTeam}
            members={members}
            user={user}
            onTeamCreated={(team) => {
              setTeams([team, ...teams]);
              selectTeam(String(team.id));
            }}
            onMemberAdded={() => setMemberReload((n) => n + 1)}
          />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title..."
              className={`${field} flex-1`}
            />
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={field}>
              <option value="">All assignees</option>
              <option value={user.id}>Me</option>
              {members
                .filter((m) => m.id !== user.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
            <button
              onClick={() => setModal({ task: null })}
              disabled={!teams.length}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              + New task
            </button>
          </div>

          {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {!teams.length && <p className="text-slate-500">Create a team first to add tasks.</p>}
          {teams.length > 0 && !tasks.length && <p className="text-slate-500">No tasks found.</p>}

          <div className="grid gap-3 lg:grid-cols-2">
            {tasks.map((t) => (
              <div key={t.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="break-words font-semibold text-slate-800">{t.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>
                {t.description && <p className="mt-1 break-words text-sm text-slate-600">{t.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>Team: {t.team_name}</span>
                  <span>Assignee: {t.assignee_name || 'Unassigned'}</span>
                  {t.due_date && (
                    <span className={t.due_date < today && t.status !== 'done' ? 'font-medium text-red-600' : ''}>
                      Due: {t.due_date}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setModal({ task: t })}
                    className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTask(t)}
                    className="rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {modal && (
        <TaskModal
          task={modal.task}
          teams={teams}
          defaultTeamId={teamId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}