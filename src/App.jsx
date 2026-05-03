import { useState, useEffect, useCallback } from 'react'

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const AREAS = [
  { key: 'software',  name: 'SOFTWARE',  color: '#00E5C3', bg: 'rgba(0,229,195,.08)',  border: 'rgba(0,229,195,.2)'  },
  { key: 'hardware',  name: 'HARDWARE',  color: '#FB923C', bg: 'rgba(251,146,60,.08)', border: 'rgba(251,146,60,.2)' },
  { key: 'business',  name: 'BUSINESS',  color: '#60A5FA', bg: 'rgba(96,165,250,.08)', border: 'rgba(96,165,250,.2)' },
  { key: 'operation', name: 'OPERATION', color: '#34D399', bg: 'rgba(52,211,153,.08)', border: 'rgba(52,211,153,.2)' },
]

const PRIORITY_BADGE = {
  urgent: { label: 'URGENT',    bg: 'rgba(248,113,113,.1)',  color: '#F87171', border: 'rgba(248,113,113,.2)'  },
  normal: { label: 'NORMAL',    bg: 'rgba(91,107,130,.1)',   color: '#5B6B82', border: 'rgba(91,107,130,.15)' },
}
const TAG_BADGE = {
  week:   { label: 'THIS WEEK', bg: 'rgba(251,191,36,.1)',   color: '#FBBF24', border: 'rgba(251,191,36,.2)'  },
}

// ─── API ──────────────────────────────────────────────────────────────────────
const api = {
  get:    ()         => fetch('/api/tasks').then(r => r.json()),
  post:   (body)     => fetch('/api/tasks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  patch:  (id, body) => fetch(`/api/tasks/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()),
  delete: (id)       => fetch(`/api/tasks/${id}`, { method:'DELETE' }).then(r => r.json()),
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Badge({ cfg, label }) {
  if (!cfg) return null
  return (
    <span className="mono" style={{
      fontSize: 7, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      whiteSpace: 'nowrap', letterSpacing: '.3px'
    }}>
      {label || cfg.label}
    </span>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 12, height: 12, border: '2px solid var(--b2)',
      borderTopColor: 'var(--ac)', borderRadius: '50%'
    }} className="spin" />
  )
}

function TaskCard({ task, onToggle, onDelete, saving }) {
  const [hovered, setHovered] = useState(false)
  const [confirming, setConfirming] = useState(false)

  function handleDelete(e) {
    e.stopPropagation()
    if (!confirming) { setConfirming(true); setTimeout(() => setConfirming(false), 2500); return }
    onDelete(task.id)
    setConfirming(false)
  }

  return (
    <div
      className="fade-up"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirming(false) }}
      onClick={() => onToggle(task.id, !task.done)}
      style={{
        padding: '7px 9px',
        background: task.done ? 'rgba(255,255,255,.01)' : 'var(--s2)',
        border: `1px solid ${hovered && !task.done ? 'var(--b2)' : 'var(--b1)'}`,
        borderRadius: 7,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        opacity: task.done ? .45 : 1,
        transition: 'background .1s, border-color .1s, opacity .15s',
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 13, height: 13, borderRadius: 3, flexShrink: 0, marginTop: 1,
        border: task.done ? '1.5px solid var(--ac)' : '1.5px solid var(--b2)',
        background: task.done ? 'var(--ac)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .12s',
      }}>
        {task.done && (
          <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
            <path d="M1 2.5L3 4.5L6 1" stroke="#07090E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 9, fontWeight: 600, color: task.done ? 'var(--t3)' : 'var(--t1)',
          lineHeight: 1.45, textDecoration: task.done ? 'line-through' : 'none'
        }}>
          {task.txt}
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
          {task.pri === 'urgent' && <Badge cfg={PRIORITY_BADGE.urgent} />}
          {task.tag === 'week'   && <Badge cfg={TAG_BADGE.week} />}
          <span className="mono" style={{ fontSize: 7, color: 'var(--t3)', fontWeight: 600 }}>
            {task.owner}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {saving && <Spinner />}
        {hovered && !saving && (
          <button
            onClick={handleDelete}
            style={{
              width: 18, height: 18, borderRadius: 3, border: `1px solid ${confirming ? 'rgba(248,113,113,.4)' : 'var(--b2)'}`,
              background: confirming ? 'rgba(248,113,113,.1)' : 'transparent',
              color: confirming ? '#F87171' : 'var(--t3)',
              fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .12s',
            }}
            title={confirming ? 'Click again to confirm delete' : 'Delete task'}
          >
            {confirming ? '!' : '×'}
          </button>
        )}
      </div>
    </div>
  )
}

function AddTaskRow({ area, onAdd }) {
  const [open, setOpen] = useState(false)
  const [txt, setTxt] = useState('')
  const [sec, setSec] = useState('')
  const [pri, setPri] = useState('normal')
  const [tag, setTag] = useState('')
  const [owner, setOwner] = useState('CEO')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!txt.trim()) return
    setSaving(true)
    await onAdd({ area, txt: txt.trim(), sec: sec.trim() || 'General', pri, tag: tag || null, owner: owner.trim() || 'CEO' })
    setTxt(''); setSec(''); setPri('normal'); setTag(''); setOwner('CEO')
    setSaving(false)
    setOpen(false)
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      style={{
        width: '100%', padding: '5px 9px', background: 'transparent',
        border: '1px dashed var(--b2)', borderRadius: 7, cursor: 'pointer',
        fontSize: 8, color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif',
        textAlign: 'center', marginTop: 2, transition: 'all .12s',
      }}
      onMouseEnter={e => { e.target.style.borderColor='var(--ac)'; e.target.style.color='var(--ac)'; e.target.style.background='var(--ac1)' }}
      onMouseLeave={e => { e.target.style.borderColor='var(--b2)'; e.target.style.color='var(--t3)'; e.target.style.background='transparent' }}
    >
      + add task
    </button>
  )

  return (
    <div style={{ background: 'var(--s3)', border: '1px solid var(--ac)', borderRadius: 7, padding: 8, marginTop: 2 }} className="fade-up">
      <input
        autoFocus
        value={txt}
        onChange={e => setTxt(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
        placeholder="Task description..."
        style={{
          width: '100%', padding: '5px 8px', background: 'var(--s2)',
          border: '1px solid var(--b2)', borderRadius: 5, color: 'var(--t1)',
          fontSize: 10, fontFamily: 'DM Sans, sans-serif', outline: 'none', marginBottom: 5,
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 5 }}>
        <input
          value={sec}
          onChange={e => setSec(e.target.value)}
          placeholder="Section (optional)"
          style={{
            padding: '4px 7px', background: 'var(--s2)', border: '1px solid var(--b2)',
            borderRadius: 5, color: 'var(--t1)', fontSize: 9, fontFamily: 'DM Sans, sans-serif', outline: 'none',
          }}
        />
        <input
          value={owner}
          onChange={e => setOwner(e.target.value)}
          placeholder="Owner"
          style={{
            padding: '4px 7px', background: 'var(--s2)', border: '1px solid var(--b2)',
            borderRadius: 5, color: 'var(--t1)', fontSize: 9, fontFamily: 'DM Sans, sans-serif', outline: 'none',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {['urgent','normal'].map(p => (
          <button key={p} onClick={() => setPri(p)} style={{
            padding: '3px 8px', borderRadius: 4, border: `1px solid ${pri===p ? (p==='urgent'?'rgba(248,113,113,.4)':'var(--b2)') : 'var(--b1)'}`,
            background: pri===p ? (p==='urgent'?'rgba(248,113,113,.1)':'var(--b1)') : 'transparent',
            color: pri===p ? (p==='urgent'?'#F87171':'var(--t2)') : 'var(--t3)',
            fontSize: 8, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase',
          }}>
            {p}
          </button>
        ))}
        <button onClick={() => setTag(tag==='week'?'':'week')} style={{
          padding: '3px 8px', borderRadius: 4,
          border: `1px solid ${tag==='week'?'rgba(251,191,36,.4)':'var(--b1)'}`,
          background: tag==='week'?'rgba(251,191,36,.1)':'transparent',
          color: tag==='week'?'#FBBF24':'var(--t3)',
          fontSize: 8, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace',
        }}>
          THIS WEEK
        </button>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={submit} disabled={saving || !txt.trim()} style={{
          flex: 1, padding: '5px 0', background: 'var(--ac)', border: 'none', borderRadius: 5,
          color: 'var(--bg)', fontSize: 9, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'IBM Plex Mono, monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          opacity: (!txt.trim() || saving) ? .5 : 1,
        }}>
          {saving ? <Spinner /> : 'ADD TASK'}
        </button>
        <button onClick={() => setOpen(false)} style={{
          padding: '5px 10px', background: 'transparent', border: '1px solid var(--b2)',
          borderRadius: 5, color: 'var(--t3)', fontSize: 9, cursor: 'pointer',
        }}>
          ✕
        </button>
      </div>
    </div>
  )
}

function AreaPanel({ area, tasks, onToggle, onDelete, onAdd, savingIds }) {
  const allTasks = tasks.filter(t => t.area === area.key)
  const donePct = allTasks.length ? Math.round(allTasks.filter(t => t.done).length / allTasks.length * 100) : 0

  // Group by section
  const sections = []
  tasks.filter(t => t.area === area.key).forEach(t => {
    let s = sections.find(x => x.name === t.sec)
    if (!s) { s = { name: t.sec, tasks: [] }; sections.push(s) }
    s.tasks.push(t)
  })

  return (
    <div style={{
      background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 10,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '9px 12px', borderBottom: '1px solid var(--b1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: area.color, flexShrink: 0 }} />
          <span className="mono" style={{ fontSize: 10, fontWeight: 800, color: area.color, letterSpacing: '.6px' }}>
            {area.name}
          </span>
        </div>
        <span className="mono" style={{
          fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
          background: area.bg, color: area.color, border: `1px solid ${area.border}`,
        }}>
          {tasks.filter(t => t.area === area.key).length} tasks
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'var(--b1)', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${donePct}%`, background: area.color, transition: 'width .4s' }} />
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 7, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {sections.length === 0 && (
          <div style={{ fontSize: 9, color: 'var(--t3)', padding: '8px 2px' }}>No tasks in this view</div>
        )}
        {sections.map(sec => (
          <div key={sec.name}>
            <div className="mono" style={{
              fontSize: 7, fontWeight: 700, letterSpacing: '1.2px', color: 'var(--t3)',
              textTransform: 'uppercase', padding: '5px 2px 3px',
              borderTop: '1px solid var(--b1)', marginTop: 2,
            }}>
              {sec.name}
            </div>
            {sec.tasks.map(task => (
              <div key={task.id} style={{ marginBottom: 3 }}>
                <TaskCard
                  task={task}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  saving={savingIds.has(task.id)}
                />
              </div>
            ))}
          </div>
        ))}
        <AddTaskRow area={area.key} onAdd={onAdd} />
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [savingIds, setSavingIds] = useState(new Set())
  const [toast, setToast] = useState(null)

  // Load tasks
  useEffect(() => {
    api.get()
      .then(data => { setTasks(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setError('Failed to load tasks'); setLoading(false) })
  }, [])

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2800)
  }

  const filteredTasks = useCallback((tasks) => {
    return tasks.filter(t => {
      if (filter === 'done')   return t.done
      if (filter === 'urgent') return t.pri === 'urgent' && !t.done
      if (filter === 'week')   return t.tag === 'week' && !t.done
      return true
    })
  }, [filter])

  async function handleToggle(id, done) {
    setSavingIds(s => new Set(s).add(id))
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t))
    try {
      await api.patch(id, { done })
      showToast(done ? '✓ Task completed' : '↩ Task reopened')
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t))
      showToast('Failed to update task', false)
    } finally {
      setSavingIds(s => { const n = new Set(s); n.delete(id); return n })
    }
  }

  async function handleDelete(id) {
    setSavingIds(s => new Set(s).add(id))
    const prev = tasks
    setTasks(t => t.filter(x => x.id !== id))
    try {
      await api.delete(id)
      showToast('Task deleted')
    } catch {
      setTasks(prev)
      showToast('Failed to delete', false)
    } finally {
      setSavingIds(s => { const n = new Set(s); n.delete(id); return n })
    }
  }

  async function handleAdd(body) {
    const temp = { ...body, id: `tmp_${Date.now()}`, done: false }
    setTasks(prev => [...prev, temp])
    try {
      const created = await api.post(body)
      setTasks(prev => prev.map(t => t.id === temp.id ? created : t))
      showToast('Task added')
    } catch {
      setTasks(prev => prev.filter(t => t.id !== temp.id))
      showToast('Failed to add task', false)
    }
  }

  const visible = filteredTasks(tasks)
  const totalDone = tasks.filter(t => t.done).length
  const totalUrgent = tasks.filter(t => t.pri === 'urgent' && !t.done).length
  const totalWeek = tasks.filter(t => t.tag === 'week' && !t.done).length

  const FILTERS = [
    { key: 'all',    label: 'ALL' },
    { key: 'urgent', label: 'URGENT' },
    { key: 'week',   label: 'THIS WEEK' },
    { key: 'done',   label: 'DONE' },
  ]

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--b2)', borderTopColor: 'var(--ac)', borderRadius: '50%' }} className="spin" />
      <span className="mono" style={{ fontSize: 10, color: 'var(--t3)' }}>LOADING TASKS...</span>
    </div>
  )

  if (error) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 24 }}>⚠</span>
      <span style={{ fontSize: 12, color: 'var(--d)' }}>{error}</span>
      <button onClick={() => window.location.reload()} style={{ padding: '6px 14px', background: 'var(--ac1)', border: '1px solid var(--ac)', borderRadius: 6, color: 'var(--ac)', fontSize: 10, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}>
        RETRY
      </button>
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: '10px 14px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid var(--b1)', flexShrink: 0, flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--ac), #00B4D8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: 'var(--bg)', fontFamily: 'IBM Plex Mono, monospace',
          }}>C</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.3px' }}>CEO Task Board</div>
            <div className="mono" style={{ fontSize: 8, color: 'var(--t3)' }}>PT CASAN Energi Indonesia — May 2026</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="mono"
              style={{
                padding: '4px 9px', borderRadius: 5, border: `1px solid ${filter === f.key ? 'rgba(0,229,195,.3)' : 'var(--b1)'}`,
                background: filter === f.key ? 'var(--ac1)' : 'transparent',
                color: filter === f.key ? 'var(--ac)' : 'var(--t3)',
                fontSize: 8, fontWeight: 700, cursor: 'pointer', transition: 'all .12s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, marginBottom: 10, flexShrink: 0 }}>
        {[
          { l: 'TOTAL',     v: tasks.length,                    c: 'var(--t1)' },
          { l: 'DONE',      v: `${totalDone} / ${tasks.length}`, c: 'var(--g)'  },
          { l: 'URGENT',    v: totalUrgent,                     c: 'var(--d)'  },
          { l: 'THIS WEEK', v: totalWeek,                       c: 'var(--w)'  },
        ].map(s => (
          <div key={s.l} style={{ padding: '7px 10px', background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 7 }}>
            <div className="mono" style={{ fontSize: 7, color: 'var(--t3)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>{s.l}</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* 4-Area Grid */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8,
      }}>
        {AREAS.map(area => (
          <AreaPanel
            key={area.key}
            area={area}
            tasks={visible}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onAdd={handleAdd}
            savingIds={savingIds}
          />
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fade-up" style={{
          position: 'fixed', bottom: 16, right: 16,
          padding: '8px 14px', borderRadius: 8,
          background: toast.ok ? 'var(--g1)' : 'var(--d1)',
          border: `1px solid ${toast.ok ? 'rgba(52,211,153,.15)' : 'rgba(248,113,113,.15)'}`,
          color: toast.ok ? 'var(--g)' : 'var(--d)',
          fontSize: 11, fontWeight: 600,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
