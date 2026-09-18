import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const emptyTask = { title: '', description: '', priority: 'medium' }

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
    const refreshed = await fetch(`${API_URL}/auth/token/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: localStorage.getItem('refreshToken') }),
    })
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

function validateAuth(form, mode) {
  if (!form.username.trim()) return 'Username is required.'
  if (form.username.trim().length < 3) return 'Username must contain at least 3 characters.'
  if (!/^[\w.@+-]+$/.test(form.username)) return 'Username contains unsupported characters.'
  if (mode === 'register' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.'
  if (!form.password) return 'Password is required.'
  if (mode === 'register' && form.password.length < 8) return 'Password must contain at least 8 characters.'
  return ''
}

function Toast({ toast, close }) {
  if (!toast) return null
  return <div className={`toast ${toast.type}`} role="status" aria-live="polite"><span>{toast.type === 'success' ? '✓' : '!'}</span><p>{toast.message}</p><button aria-label="Dismiss message" onClick={close}>×</button></div>
}

function AuthScreen({ onAuthenticated, notify, toast, closeToast }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function changeMode(next) { setMode(next); setError(''); setForm({ username: '', email: '', password: '' }) }
  function change(field, value) { setForm((current) => ({ ...current, [field]: value })); setError('') }
  async function submit(event) {
    event.preventDefault()
    const validationError = validateAuth(form, mode)
    if (validationError) { setError(validationError); notify(validationError, 'error'); return }
    setBusy(true); setError('')
    try {
      if (mode === 'register') await api('/auth/register', { method: 'POST', body: JSON.stringify({ ...form, username: form.username.trim(), email: form.email.trim() }) })
      const tokens = await api('/auth/token', { method: 'POST', body: JSON.stringify({ username: form.username.trim(), password: form.password }) })
      localStorage.setItem('accessToken', tokens.access); localStorage.setItem('refreshToken', tokens.refresh)
      notify(mode === 'register' ? 'Account created. Welcome to Intego!' : 'Welcome back!', 'success')
      await onAuthenticated()
    } catch (err) { setError(err.message); notify(err.message, 'error') }
    finally { setBusy(false) }
  }

  return <main className="auth-shell">
    <Toast toast={toast} close={closeToast} />
    <section className="auth-copy"><img className="auth-logo" src="/intego-logo.png" alt="Intego" /><h1>Make space for what matters.</h1><p>A focused task manager for planning clearly and finishing confidently.</p><div className="feature-list"><span>✓ Private workspace</span><span>✓ Priority tracking</span><span>✓ Simple filters</span></div></section>
    <section className="auth-card">
      <div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Sign in</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>Create account</button></div>
      <h2>{mode === 'login' ? 'Welcome back' : 'Start organizing'}</h2><p className="muted">{mode === 'login' ? 'Enter your details to continue.' : 'Create your secure workspace.'}</p>
      <form onSubmit={submit} noValidate>
        <label>Username<input required minLength="3" maxLength="150" value={form.username} onChange={(e) => change('username', e.target.value)} /></label>
        {mode === 'register' && <label>Email<input required type="email" value={form.email} onChange={(e) => change('email', e.target.value)} /></label>}
        <label>Password<input required minLength={mode === 'register' ? 8 : 1} type="password" value={form.password} onChange={(e) => change('password', e.target.value)} /></label>
        {error && <p className="error">{error}</p>}<button className="primary wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
    </section>
  </main>
}

function App() {
  const [user, setUser] = useState(null), [tasks, setTasks] = useState([]), [filter, setFilter] = useState('all')
  const [form, setForm] = useState(emptyTask), [editingId, setEditingId] = useState(null), [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('accessToken'))), [toast, setToast] = useState(null)
  const [search, setSearch] = useState(''), [page, setPage] = useState(1), [showForm, setShowForm] = useState(false)
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null })
  const [section, setSection] = useState('dashboard')
  const searchTimer = useRef(null)
  const notify = useCallback((message, type = 'success') => {
    const id = Date.now(); setToast({ id, message, type })
    window.setTimeout(() => setToast((current) => current?.id === id ? null : current), 4000)
  }, [])
  const loadSession = useCallback(async () => {
    try { const [profile, list] = await Promise.all([api('/auth/me'), api('/tasks')]); setUser(profile); setTasks(list.results); setPagination(list) }
    catch { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); setUser(null); notify('Your session expired. Please sign in again.', 'error') }
    finally { setLoading(false) }
  }, [notify])
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { if (localStorage.getItem('accessToken')) loadSession() }, [loadSession])

  async function loadTasks(nextFilter = filter, nextPage = page, nextSearch = search) {
    const params = new URLSearchParams({ page: String(nextPage) })
    if (nextFilter !== 'all') params.set('status', nextFilter)
    if (nextSearch.trim()) params.set('search', nextSearch.trim())
    try { const data = await api(`/tasks?${params}`); setTasks(data.results); setPagination(data); setPage(nextPage) }
    catch (err) { notify(err.message, 'error') }
  }
  function searchAsYouType(value) {
    setSearch(value)
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => loadTasks(filter, 1, value), 300)
  }
  async function saveTask(event) {
    event.preventDefault(); const title = form.title.trim()
    const validationError = !title ? 'Task title is required.' : title.length < 3 ? 'Task title must contain at least 3 characters.' : title.length > 255 ? 'Task title cannot exceed 255 characters.' : ''
    if (validationError) { setError(validationError); notify(validationError, 'error'); return }
    setError('')
    try {
      const wasEditing = Boolean(editingId)
      await api(editingId ? `/tasks/${editingId}` : '/tasks', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify({ ...form, title }) })
      setForm(emptyTask); setEditingId(null); setShowForm(false); await loadTasks(filter, wasEditing ? page : 1, search); notify(wasEditing ? 'Task updated successfully.' : 'Task created successfully.')
    } catch (err) { setError(err.message); notify(err.message, 'error') }
  }
  async function toggleTask(task) { try { const done = task.status !== 'completed'; await api(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status: done ? 'completed' : 'pending' }) }); await loadTasks(); notify(done ? 'Task marked as completed.' : 'Task moved back to pending.') } catch (err) { notify(err.message, 'error') } }
  async function removeTask(id) { if (!window.confirm('Delete this task permanently?')) return; try { await api(`/tasks/${id}`, { method: 'DELETE' }); await loadTasks(); notify('Task deleted.') } catch (err) { notify(err.message, 'error') } }
  function editTask(task) { setEditingId(task.id); setError(''); setForm({ title: task.title, description: task.description, priority: task.priority }); setShowForm(true); notify('Task loaded for editing.') }
  function cancelEdit() { setEditingId(null); setForm(emptyTask); setError(''); setShowForm(false); notify('Editing cancelled.') }
  function addTask() { setEditingId(null); setForm(emptyTask); setError(''); setShowForm(true) }
  function logout() { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); setUser(null); setTasks([]); notify('You have signed out.') }

  if (loading) return <><Toast toast={toast} close={() => setToast(null)} /><div className="loading">Loading your workspace…</div></>
  if (!user) return <AuthScreen onAuthenticated={loadSession} notify={notify} toast={toast} closeToast={() => setToast(null)} />
  const totalPages = Math.max(1, Math.ceil(pagination.count / 6))
  const completedOnPage = tasks.filter((task) => task.status === 'completed').length
  const titles = { dashboard: 'Dashboard', tasks: 'Task list', settings: 'Settings' }
  return <div className="app-shell">
    <Toast toast={toast} close={() => setToast(null)} />
    <aside className="sidebar"><div className="brand"><img src="/intego-logo.png" alt="Intego" /></div><nav>{[['dashboard', '▦', 'Dashboard'], ['tasks', '✓', 'Task list'], ['settings', '⚙', 'Settings']].map(([key, icon, label]) => <button key={key} className={section === key ? 'active' : ''} onClick={() => setSection(key)}><span>{icon}</span>{label}</button>)}</nav><p>Stay focused.<br />Make progress.</p></aside>
    <div className="app-main"><header><div><span className="header-label">WORKSPACE</span><h2>{titles[section]}</h2></div><details className="user-menu"><summary><span className="avatar">{user.username[0].toUpperCase()}</span><span className="user-name">{user.username}</span><span>⌄</span></summary><div className="user-dropdown"><div><strong>{user.username}</strong><small>{user.email || 'Intego member'}</small></div><button onClick={() => setSection('settings')}>Account settings</button><button className="logout" onClick={logout}>Sign out</button></div></details></header>
    <main className="workspace">
      {section === 'dashboard' && <section><div className="intro"><div><span className="eyebrow">OVERVIEW</span><h1>Good day, {user.username}.</h1><p>Here is a quick look at your workspace.</p></div><button className="primary add-task" onClick={addTask}>+ Add task</button></div><div className="overview-grid"><article className="metric card"><span>Total tasks</span><strong>{pagination.count}</strong><small>Across your workspace</small></article><article className="metric card"><span>On this page</span><strong>{tasks.length}</strong><small>Page {page} of {totalPages}</small></article><article className="metric card"><span>Completed here</span><strong>{completedOnPage}</strong><small>Keep the momentum going</small></article></div><div className="recent card"><div className="recent-head"><div><h2>Recent tasks</h2><p className="muted">Your latest items at a glance.</p></div><button className="ghost" onClick={() => setSection('tasks')}>View all →</button></div>{tasks.slice(0, 4).map((task) => <div className="recent-row" key={task.id}><button className="check" onClick={() => toggleTask(task)}>{task.status === 'completed' ? '✓' : ''}</button><span className={task.status === 'completed' ? 'done' : ''}>{task.title}</span><span className={`priority ${task.priority}`}>{task.priority}</span></div>)}{tasks.length === 0 && <p className="muted">No tasks yet. Add your first one.</p>}</div></section>}
      {section === 'tasks' && <section className="task-section first"><div className="task-heading"><div><h2>Your tasks</h2><p className="muted">Search, filter, and work through your list.</p></div><button className="primary add-task" onClick={addTask}>+ Add task</button></div><div className="task-tools"><div className="search"><input aria-label="Search tasks" placeholder="Start typing to search…" value={search} onChange={(e) => searchAsYouType(e.target.value)} />{search && <button type="button" className="clear" onClick={() => searchAsYouType('')}>Clear</button>}</div><div className="filters">{['all', 'pending', 'completed'].map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => { setFilter(item); loadTasks(item, 1, search) }}>{item}</button>)}</div></div><div className="task-list">{tasks.length === 0 && <div className="empty card"><span>✓</span><h3>No tasks here</h3><p>Create a task or choose another filter.</p></div>}{tasks.map((task) => <article className={`task card ${task.status}`} key={task.id}><button className="check" aria-label="Toggle completion" onClick={() => toggleTask(task)}>{task.status === 'completed' ? '✓' : ''}</button><div className="task-content"><div className="task-meta"><span className={`priority ${task.priority}`}>{task.priority}</span><time>{new Date(task.createdAt).toLocaleDateString()}</time></div><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}</div><div className="task-actions"><button onClick={() => editTask(task)}>Edit</button><button className="danger" onClick={() => removeTask(task.id)}>Delete</button></div></article>)}</div>{totalPages > 1 && <nav className="pagination" aria-label="Task pages"><button disabled={!pagination.previous} onClick={() => loadTasks(filter, page - 1, search)}>← Previous</button><span>Page {page} of {totalPages}</span><button disabled={!pagination.next} onClick={() => loadTasks(filter, page + 1, search)}>Next →</button></nav>}</section>}
      {section === 'settings' && <section><div className="intro"><div><span className="eyebrow">ACCOUNT</span><h1>Settings</h1><p>Review your profile and session information.</p></div></div><div className="settings-grid"><article className="settings-card card"><h2>Profile</h2><div className="profile-large"><span className="avatar">{user.username[0].toUpperCase()}</span><div><strong>{user.username}</strong><p>{user.email || 'No email provided'}</p></div></div><dl><div><dt>User ID</dt><dd>{user.id}</dd></div><div><dt>Username</dt><dd>{user.username}</dd></div><div><dt>Email</dt><dd>{user.email || 'Not set'}</dd></div></dl></article><article className="settings-card card"><h2>Security</h2><p className="muted">Your account uses JWT authentication and automatic access-token refresh.</p><button className="danger-button" onClick={logout}>Sign out of this device</button></article></div></section>}
      {showForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelEdit() }}><section className="composer card modal"><button className="modal-close" aria-label="Close task form" onClick={cancelEdit}>×</button><div><h2>{editingId ? 'Edit task' : 'Add a new task'}</h2><p className="muted">Keep it clear and actionable.</p></div><form onSubmit={saveTask} noValidate>
        <label>Task title<input autoFocus required minLength="3" maxLength="255" placeholder="What needs to be done?" value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); setError('') }} /></label><label>Description<textarea maxLength="2000" placeholder="Add helpful details…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="form-row"><label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><div className="form-actions"><button type="button" className="ghost" onClick={cancelEdit}>Cancel</button><button className="primary">{editingId ? 'Save changes' : 'Add task'}</button></div></div>{error && <p className="error">{error}</p>}
      </form></section></div>}
    </main></div>
  </div>
}

export default App
