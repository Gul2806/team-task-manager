import { useEffect, useState } from 'react';
import api from '../api';

export default function TaskModal({ task, teams, defaultTeamId, onClose, onSaved }) {
  const editing = Boolean(task);
  const [form, setForm] = useState({
    team_id: task?.team_id ?? (defaultTeamId || teams[0]?.id || ''),
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? 'todo',
    assignee_id: task?.assignee_id ?? '',
    due_date: task?.due_date ?? '',
  });
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!form.team_id) return;
    api
      .get(`/teams/${form.team_id}/members`)
      .then((r) => setMembers(r.data))
      .catch(() => setMembers([]));
  }, [form.team_id]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value, ...(name === 'team_id' ? { assignee_id: '' } : {}) }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const payload = {
      title: form.title,
      description: form.description,
      status: form.status,
      assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
      due_date: form.due_date || null,
    };
    try {
      if (editing) await api.put(`/tasks/${task.id}`, payload);
      else await api.post('/tasks', { ...payload, team_id: Number(form.team_id) });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save task');
      setBusy(false);
    }
  };

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500';
  const label = 'mb-1 block text-sm font-medium text-slate-700';

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-xl bg-white p-5 shadow-lg">
        <h2 className="text-xl font-bold text-slate-800">{editing ? 'Edit task' : 'New task'}</h2>
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div>
          <label className={label}>Team</label>
          <select name="team_id" value={form.team_id} onChange={onChange} disabled={editing} className={input}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Title</label>
          <input name="title" value={form.title} onChange={onChange} className={input} required maxLength={200} />
        </div>

        <div>
          <label className={label}>Description</label>
          <textarea name="description" value={form.description} onChange={onChange} rows={3} className={input} maxLength={2000} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Status</label>
            <select name="status" value={form.status} onChange={onChange} className={input}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className={label}>Due date</label>
            <input type="date" name="due_date" value={form.due_date} onChange={onChange} className={input} />
          </div>
        </div>

        <div>
          <label className={label}>Assignee</label>
          <select name="assignee_id" value={form.assignee_id} onChange={onChange} className={input}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">
            Cancel
          </button>
          <button disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}