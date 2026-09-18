import { useCallback, useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function messageFrom(data) {
  if (data?.detail) return data.detail
  const first = data && Object.values(data)[0]
  return Array.isArray(first) ? first[0] : first || 'Something went wrong.'
}

async function api(path, options = {}, retry = true) {
  const access = localStorage.getItem('accessToken')
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}), ...options.headers },
  })
  if (response.status === 401 && retry && localStorage.getItem('refreshToken')) {
    const refreshed = await fetch(`${API_URL}/auth/token/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh: localStorage.getItem('refreshToken') }) })
    if (refreshed.ok) {
      localStorage.setItem('accessToken', (await refreshed.json()).access)
      return api(path, options, false)
    }
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(messageFrom(data))
  return data
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      if (mode === 'register') await api('/auth/register', { method: 'POST', body: JSON.stringify(form) })
      const tokens = await api('/auth/token', { method: 'POST', body: JSON.stringify({ username: form.username, password: form.password }) })
      localStorage.setItem('accessToken', tokens.access); localStorage.setItem('refreshToken', tokens.refresh)
      onAuthenticated()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <main className="auth-shell">
    <section className="auth-copy"><span className="eyebrow">TASKFLOW</span><h1>Make space for what matters.</h1><p>A focused task manager for planning clearly and finishing confidently.</p><div className="feature-list"><span>✓ Private workspace</span><span>✓ Priority tracking</span><span>✓ Simple filters</span></div></section>
    <section className="auth-card"><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button></div><h2>{mode === 'login' ? 'Welcome back' : 'Start organizing'}</h2><p className="muted">{mode === 'login' ? 'Enter your details to continue.' : 'Create your secure workspace.'}</p>
      <form onSubmit={submit}><label>Username<input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>{mode === 'register' && <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>}<label>Password<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>{error && <p className="error">{error}</p>}<button className="primary wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form>
    </section>
  </main>
}

const emptyTask = { title: '', description: '', priority: 'medium' }

function App() {
  const [user, setUser] = useState(null), [tasks, setTasks] = useState([]), [filter, setFilter] = useState('all')
  const [form, setForm] = useState(emptyTask), [editingId, setEditingId] = useState(null), [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('accessToken')))
  const loadSession = useCallback(async () => {
    try { const [profile, list] = await Promise.all([api('/auth/me'), api('/tasks')]); setUser(profile); setTasks(list) }
    catch { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); setUser(null) }
    finally { setLoading(false) }
  }, [])
  // Session restoration intentionally updates authentication state after mount.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { if (localStorage.getItem('accessToken')) loadSession() }, [loadSession])
  async function loadTasks(next = filter) { setTasks(await api(`/tasks${next === 'all' ? '' : `?status=${next}`}`)) }
  async function saveTask(event) {
    event.preventDefault(); setError('')
    try { await api(editingId ? `/tasks/${editingId}` : '/tasks', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(form) }); setForm(emptyTask); setEditingId(null); await loadTasks() }
    catch (err) { setError(err.message) }
  }
  async function toggleTask(task) { await api(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status: task.status === 'completed' ? 'pending' : 'completed' }) }); await loadTasks() }
  async function removeTask(id) { await api(`/tasks/${id}`, { method: 'DELETE' }); await loadTasks() }
  function editTask(task) { setEditingId(task.id); setForm({ title: task.title, description: task.description, priority: task.priority }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function logout() { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); setUser(null); setTasks([]) }
  if (loading) return <div className="loading">Loading your workspace…</div>
  if (!user) return <AuthScreen onAuthenticated={loadSession} />
  const completed = tasks.filter((task) => task.status === 'completed').length
  return <div className="app-shell">
    <header><div className="brand"><span className="brand-mark">✓</span> TaskFlow</div><div className="profile"><span>{user.username}</span><button className="ghost" onClick={logout}>Sign out</button></div></header>
    <main className="workspace"><section className="intro"><div><span className="eyebrow">MY WORKSPACE</span><h1>Good day, {user.username}.</h1><p>Capture the work, choose what matters, and make progress.</p></div><div className="stat"><strong>{tasks.length}</strong><span>tasks shown</span><small>{completed} completed</small></div></section>
      <section className="composer card"><div><h2>{editingId ? 'Edit task' : 'Add a new task'}</h2><p className="muted">Keep it clear and actionable.</p></div><form onSubmit={saveTask}><label>Task title<input required placeholder="What needs to be done?" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>Description<textarea placeholder="Add helpful details…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="form-row"><label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><div className="form-actions">{editingId && <button type="button" className="ghost" onClick={() => { setEditingId(null); setForm(emptyTask) }}>Cancel</button>}<button className="primary">{editingId ? 'Save changes' : 'Add task'}</button></div></div>{error && <p className="error">{error}</p>}</form></section>
      <section className="task-section"><div className="task-heading"><div><h2>Your tasks</h2><p className="muted">One step at a time.</p></div><div className="filters">{['all', 'pending', 'completed'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={async () => { setFilter(item); await loadTasks(item) }}>{item}</button>)}</div></div><div className="task-list">{tasks.length === 0 && <div className="empty card"><span>✓</span><h3>No tasks here</h3><p>Create a task or choose another filter.</p></div>}{tasks.map((task) => <article className={`task card ${task.status}`} key={task.id}><button className="check" aria-label="Toggle completion" onClick={() => toggleTask(task)}>{task.status === 'completed' ? '✓' : ''}</button><div className="task-content"><div className="task-meta"><span className={`priority ${task.priority}`}>{task.priority}</span><time>{new Date(task.createdAt).toLocaleDateString()}</time></div><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}</div><div className="task-actions"><button onClick={() => editTask(task)}>Edit</button><button className="danger" onClick={() => removeTask(task.id)}>Delete</button></div></article>)}</div></section>
    </main>
  </div>
}

export default App
