import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { TaskExtrasForm } from './components/TaskExtrasForm.jsx'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const AREAS = [
  { key:'software',  name:'SOFTWARE',  color:'#00E5C3', bg:'rgba(0,229,195,.08)',  border:'rgba(0,229,195,.18)'  },
  { key:'hardware',  name:'HARDWARE',  color:'#FB923C', bg:'rgba(251,146,60,.08)', border:'rgba(251,146,60,.18)' },
  { key:'business',  name:'BUSINESS',  color:'#60A5FA', bg:'rgba(96,165,250,.08)', border:'rgba(96,165,250,.18)' },
  { key:'operation', name:'OPERATION', color:'#34D399', bg:'rgba(52,211,153,.08)', border:'rgba(52,211,153,.18)' },
]
const AREA_ICONS = { software:'◈', hardware:'◉', business:'◆', operation:'◎' }

/** Invisible 1×1 pixel drag image so the browser does not show a huge semi-opaque title ghost. */
let emptyDragImage = null
function getEmptyDragImage() {
  if (typeof Image === 'undefined') return null
  if (!emptyDragImage) {
    emptyDragImage = new Image()
    emptyDragImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
  }
  return emptyDragImage
}

function DragGripIcon({ color }) {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden style={{ display: 'block', color }}>
      {[0, 1, 2].map((row) => (
        <g key={row} transform={`translate(0 ${row * 5.5})`}>
          <circle cx="3" cy="2.5" r="1.35" fill="currentColor" />
          <circle cx="9" cy="2.5" r="1.35" fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}

function mergeTaskFormPatch(prev, partial) {
  const { _appendImage, _removeImageAt, ...rest } = partial
  let next = { ...prev, ...rest }
  if (_appendImage != null) next = { ...next, images: [...(prev.images || []), _appendImage] }
  else if (_removeImageAt != null) {
    next = { ...next, images: (prev.images || []).filter((_, j) => j !== _removeImageAt) }
  }
  return next
}

/** Reorder task ids for drag-drop: move item at fromIdx to land before/after toIdx semantics (drop on target). */
function moveTaskIdInList(ids, fromIdx, toIdx) {
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return [...ids]
  const next = [...ids]
  const [x] = next.splice(fromIdx, 1)
  let ins = toIdx
  if (fromIdx < toIdx) ins = toIdx - 1
  next.splice(ins, 0, x)
  return next
}

const api = {
  get:    ()         => fetch('/api/tasks').then(r=>r.json()),
  post:   (b)        => fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:  (id,b)     => fetch(`/api/tasks/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(async r=>{
    const data = await r.json().catch(()=>({}))
    if(!r.ok) throw new Error(data.error || 'Request failed')
    return data
  }),
  delete: (id)       => fetch(`/api/tasks/${encodeURIComponent(id)}`,{method:'DELETE'}).then(r=>r.json()),
  chat:   (msg,hist) => fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,history:hist})}).then(r=>r.json()),
  sections: () => fetch('/api/sections').then(r => r.json()),
  sectionsAdd: (area, name) =>
    fetch('/api/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ area, name }) }).then(async (r) => {
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Failed')
      return d
    }),
  sectionsRename: (area, from, to) =>
    fetch('/api/sections', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ area, from, to }) }).then(async (r) => {
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Failed')
      return d
    }),
  sectionsDelete: (area, name, reassignTo) =>
    fetch('/api/sections', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ area, name, reassignTo }) }).then(async (r) => {
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Failed')
      return d
    }),
  tasksReorder: (area, sec, ids) =>
    fetch('/api/tasks/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ area, sec, ids }) }).then(async (r) => {
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Reorder failed')
      return d
    }),
}

const SUBTITLE_CUSTOM = '__subtitle_custom__'

function SubtitlePick({ value, onChange, subtitleNames, inp }) {
  const sorted = useMemo(
    () =>
      [...new Set((subtitleNames || []).map(String))]
        .map((n) => n.trim())
        .filter((n) => n && n !== 'General')
        .sort((a, b) => a.localeCompare(b)),
    [subtitleNames]
  )
  const trimmed = String(value ?? '').trim()
  const isGeneral = trimmed === '' || trimmed === 'General'
  const inList = sorted.includes(trimmed)
  const [pickCustom, setPickCustom] = useState(() => !isGeneral && !inList)

  const selectValue = pickCustom ? SUBTITLE_CUSTOM : isGeneral ? '' : trimmed

  return (
    <>
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value
          if (v === '') {
            setPickCustom(false)
            onChange('General')
          } else if (v === SUBTITLE_CUSTOM) {
            setPickCustom(true)
            if (inList || isGeneral) onChange('')
          } else {
            setPickCustom(false)
            onChange(v)
          }
        }}
        style={{ ...inp, marginBottom: pickCustom ? 4 : 6, cursor: 'pointer' }}
      >
        <option value="">General</option>
        {sorted.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        <option value={SUBTITLE_CUSTOM}>＋ New / custom…</option>
      </select>
      {pickCustom && (
        <input
          value={isGeneral ? '' : trimmed}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a new subtitle…"
          style={{ ...inp, marginBottom: 6 }}
        />
      )}
    </>
  )
}

// ─── TINY COMPONENTS ──────────────────────────────────────────────────────────
const S = {
  // Inline styles as functions for reuse
  badge: (bg, color, border) => ({
    fontSize:7, fontWeight:700, padding:'1px 5px', borderRadius:3,
    background:bg, color, border:`1px solid ${border}`, whiteSpace:'nowrap',
    fontFamily:'IBM Plex Mono, monospace', letterSpacing:'.3px'
  }),
  card: (selected, hovered) => ({
    padding:'7px 9px',
    background: selected ? 'var(--s3)' : hovered ? 'var(--s2)' : 'rgba(12,16,24,.6)',
    border:`1px solid ${selected ? 'var(--b2)' : hovered ? 'var(--b2)' : 'var(--b1)'}`,
    borderRadius:7, cursor:'pointer', display:'flex', alignItems:'flex-start', gap:8,
    transition:'all .1s',
  })
}

function Loader() {
  return <div style={{width:10,height:10,border:'1.5px solid var(--b2)',borderTopColor:'var(--ac)',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
}

function PriBadge({pri}) {
  if (pri !== 'urgent') return null
  return <span style={S.badge('rgba(248,113,113,.1)','#F87171','rgba(248,113,113,.2)')}>URGENT</span>
}
function TagBadge({tag}) {
  if (tag !== 'week') return null
  return <span style={S.badge('rgba(251,191,36,.1)','#FBBF24','rgba(251,191,36,.2)')}>THIS WEEK</span>
}

function Checkbox({checked, onChange}) {
  return (
    <div onClick={e=>{e.stopPropagation();onChange(!checked)}} style={{
      width:13,height:13,borderRadius:3,flexShrink:0,marginTop:1,cursor:'pointer',
      border:`1.5px solid ${checked?'var(--ac)':'var(--b2)'}`,
      background:checked?'var(--ac)':'transparent',
      display:'flex',alignItems:'center',justifyContent:'center',transition:'all .12s'
    }}>
      {checked && <svg width="7" height="5" viewBox="0 0 7 5"><path d="M1 2.5L3 4.5L6 1" stroke="#07090E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </div>
  )
}

// ─── TASK CARD ────────────────────────────────────────────────────────────────
function TaskCard({ task, onToggle, onDelete, onEdit, saving, dimmed, subtitleNames, reorder }) {
  const [hov, setHov] = useState(false)
  const [del, setDel] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [showMore, setShowMore] = useState(false)
  const [focusDetailsOnOpen, setFocusDetailsOnOpen] = useState(false)

  const inp = { padding:'5px 8px', background:'var(--s2)', border:'1px solid var(--b2)', borderRadius:5,
    color:'var(--t1)', fontSize:9, fontFamily:'DM Sans,sans-serif', outline:'none', width:'100%' }

  const hasExtras = Boolean((task.details && String(task.details).trim()) || (task.links && task.links.length) || (task.images && task.images.length))
  const dragId = reorder?.draggingId
  const isDraggingThis = Boolean(reorder?.enabled && dragId === task.id)
  const isDropTarget = Boolean(reorder?.enabled && dragId && dragId !== task.id && reorder.dragOverId === task.id)
  const isDragActive = Boolean(reorder?.enabled && dragId)
  const dimOthersWhileDrag = isDragActive && !isDraggingThis && !isDropTarget

  function openEdit(e, opts = {}) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
    setFocusDetailsOnOpen(!!opts.focusDetails)
    setEditing(true)
    setForm({
      txt: task.txt,
      sec: task.sec || '',
      owner: task.owner || 'CEO',
      pri: task.pri || 'normal',
      tag: task.tag || '',
      area: task.area,
      details: task.details || '',
      links: Array.isArray(task.links) ? task.links.map((l) => (typeof l === 'string' ? { url: l, label: '' } : { ...l })) : [],
      images: Array.isArray(task.images) ? [...task.images] : [],
    })
  }

  function cancelEdit() {
    setFocusDetailsOnOpen(false)
    setEditing(false)
    setForm(null)
  }

  async function saveEdit() {
    if (!form || !form.txt.trim()) return
    const updates = {
      txt: form.txt.trim(),
      sec: form.sec.trim() || 'General',
      owner: form.owner.trim() || 'CEO',
      pri: form.pri,
      tag: form.tag || null,
      area: form.area,
      details: form.details || '',
      links: form.links || [],
      images: form.images || [],
    }
    const ok = await onEdit(task.id, updates)
    if (ok) cancelEdit()
  }

  if (editing && form) {
    return (
      <div style={{...S.card(true, true), marginBottom:8, border:'1px solid rgba(0,229,195,.35)'}} onClick={e=>e.stopPropagation()}>
        <div style={{width:'100%'}}>
          <label style={{fontSize:7,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace',display:'block',marginBottom:3}}>TITLE</label>
          <textarea value={form.txt} onChange={e=>setForm(f=>({...f,txt:e.target.value}))}
            onKeyDown={e=>{ if(e.key==='Escape') cancelEdit() }}
            rows={2} placeholder="Task title" style={{...inp, resize:'vertical', minHeight:44, marginBottom:6}}/>
          <label style={{fontSize:7,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace',display:'block',marginBottom:3}}>SUBTITLE (SECTION)</label>
          <SubtitlePick value={form.sec} onChange={(sec) => setForm((f) => ({ ...f, sec }))} subtitleNames={subtitleNames} inp={inp} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:6}}>
            <div>
              <label style={{fontSize:7,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace',display:'block',marginBottom:3}}>OWNER</label>
              <input value={form.owner} onChange={e=>setForm(f=>({...f,owner:e.target.value}))} placeholder="Owner" style={inp}/>
            </div>
            <div>
              <label style={{fontSize:7,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace',display:'block',marginBottom:3}}>AREA</label>
              <select value={form.area} onChange={e=>setForm(f=>({...f,area:e.target.value}))} style={{...inp, cursor:'pointer'}}>
                {AREAS.map(a=>(<option key={a.key} value={a.key}>{a.name}</option>))}
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
            {['urgent','normal'].map(p=>(
              <button key={p} type="button" onClick={()=>setForm(f=>({...f,pri:p}))}
                style={{padding:'2px 8px',borderRadius:4,border:`1px solid ${form.pri===p?(p==='urgent'?'rgba(248,113,113,.4)':'rgba(0,229,195,.3)'):'var(--b1)'}`,
                  background:form.pri===p?(p==='urgent'?'rgba(248,113,113,.08)':'var(--ac1)'):'transparent',
                  color:form.pri===p?(p==='urgent'?'#F87171':'var(--ac)'):'var(--t3)',
                  fontSize:8,fontWeight:700,cursor:'pointer',fontFamily:'IBM Plex Mono,monospace',textTransform:'uppercase'}}>
                {p}
              </button>
            ))}
            <button type="button" onClick={()=>setForm(f=>({...f,tag:f.tag==='week'?'':'week'}))}
              style={{padding:'2px 8px',borderRadius:4,
                border:`1px solid ${form.tag==='week'?'rgba(251,191,36,.3)':'var(--b1)'}`,
                background:form.tag==='week'?'rgba(251,191,36,.08)':'transparent',
                color:form.tag==='week'?'#FBBF24':'var(--t3)',
                fontSize:8,fontWeight:700,cursor:'pointer',fontFamily:'IBM Plex Mono,monospace'}}>
              THIS WEEK
            </button>
          </div>
          <TaskExtrasForm
            details={form.details}
            links={form.links}
            images={form.images}
            disabled={saving}
            compact
            autoFocusDetails={focusDetailsOnOpen}
            onDetailsFocused={() => setFocusDetailsOnOpen(false)}
            onPatch={(p) => setForm((f) => mergeTaskFormPatch(f, p))}
          />
          <div style={{display:'flex',gap:5,marginTop:8}}>
            <button type="button" onClick={saveEdit} disabled={saving||!form.txt.trim()}
              style={{flex:1,padding:'6px 0',border:'none',borderRadius:5,background:saving||!form.txt.trim()?'var(--b2)':'var(--ac)',
                color:saving||!form.txt.trim()?'var(--t3)':'var(--bg)',fontSize:9,fontWeight:700,cursor:saving||!form.txt.trim()?'default':'pointer',
                fontFamily:'IBM Plex Mono,monospace',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
              {saving ? <Loader/> : 'SAVE'}
            </button>
            <button type="button" onClick={cancelEdit} disabled={saving}
              style={{padding:'6px 10px',background:'transparent',border:'1px solid var(--b2)',borderRadius:5,color:'var(--t3)',fontSize:9,cursor:'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);setDel(false)}}
      onDragOver={
        reorder?.enabled
          ? (e) => {
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'move'
              if (reorder.draggingId && reorder.draggingId !== task.id) {
                reorder.onDragOverTask?.(task.id)
              }
            }
          : undefined
      }
      onDrop={
        reorder?.enabled
          ? (e) => {
              e.preventDefault()
              e.stopPropagation()
              reorder.onDropOn(task.id)
            }
          : undefined
      }
      style={{
        ...S.card(false, hov || isDropTarget),
        position: 'relative',
        opacity: dimmed ? 0.35 : task.done ? 0.45 : isDraggingThis ? 0.5 : dimOthersWhileDrag ? 0.62 : 1,
        marginBottom: 3,
        border: isDropTarget ? '1px solid rgba(0,229,195,.55)' : undefined,
        boxShadow: isDropTarget ? '0 0 0 1px rgba(0,229,195,.12), 0 4px 20px rgba(0,0,0,.25)' : undefined,
        transition: 'opacity .12s ease, border-color .12s ease, box-shadow .12s ease',
      }}
    >
      {isDropTarget && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 8,
            right: 8,
            top: -4,
            height: 3,
            borderRadius: 2,
            background: 'var(--ac)',
            boxShadow: '0 0 10px rgba(0,229,195,.55)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}
      {reorder?.enabled && (
        <div
          draggable
          aria-label="Drag to reorder this task in the list"
          aria-grabbed={isDraggingThis}
          title="Drag onto another row to change order (same subtitle only)"
          onDragStart={(e) => {
            e.stopPropagation()
            reorder.onDragStart(task.id)
            try {
              e.dataTransfer.setData('text/plain', task.id)
              e.dataTransfer.effectAllowed = 'move'
              const ghost = getEmptyDragImage()
              if (ghost) e.dataTransfer.setDragImage(ghost, 0, 0)
            } catch {
              /* ignore */
            }
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '4px 5px 4px 4px',
            margin: '-2px 0 -2px -2px',
            borderRadius: 6,
            cursor: 'grab',
            color: hov || isDraggingThis ? 'var(--ac)' : 'var(--t3)',
            background: hov ? 'rgba(0,229,195,.08)' : 'transparent',
            border: hov ? '1px solid rgba(0,229,195,.2)' : '1px solid transparent',
            userSelect: 'none',
            transition: 'background .12s, border-color .12s, color .12s',
          }}
        >
          <DragGripIcon color="currentColor" />
        </div>
      )}
      <Checkbox checked={task.done} onChange={v=>onToggle(task.id,v)}/>
      <div style={{flex:1,minWidth:0}}>
        <div
          role="button"
          tabIndex={0}
          title="Click to edit — focus details"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openEdit(e, { focusDetails: true })
            }
          }}
          onClick={(e) => openEdit(e, { focusDetails: true })}
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: task.done ? 'var(--t3)' : 'var(--t1)',
            lineHeight: 1.45,
            textDecoration: task.done ? 'line-through' : 'none',
            cursor: 'text',
            borderRadius: 4,
          }}
        >
          {task.txt}
        </div>
        <div style={{display:'flex',gap:3,alignItems:'center',marginTop:3,flexWrap:'wrap'}}>
          <PriBadge pri={task.pri}/><TagBadge tag={task.tag}/>
          <span style={{fontSize:7,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace'}}>{task.owner}</span>
        </div>
        {hasExtras && (
          <div style={{marginTop:5}}>
            {(task.details && String(task.details).trim()) ? (
              <div style={{fontSize:8,color:'var(--t2)',lineHeight:1.35,whiteSpace:'pre-wrap',maxHeight:showMore?240:36,overflow:'hidden'}}>
                {showMore ? task.details : `${String(task.details).slice(0, 100)}${String(task.details).length>100?'…':''}`}
              </div>
            ) : null}
            {task.links && task.links.length > 0 && (
              <div style={{marginTop:4,display:'flex',flexDirection:'column',gap:2}}>
                {(showMore ? task.links : task.links.slice(0, 2)).map((l, i) => {
                  const url = typeof l === 'string' ? l : l.url
                  const lab = typeof l === 'string' ? '' : (l.label || '')
                  return (
                    <a key={i} href={url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                      style={{fontSize:8,color:'var(--ac)',textDecoration:'underline',wordBreak:'break-all'}}>
                      {lab || url}
                    </a>
                  )
                })}
              </div>
            )}
            {task.images && task.images.length > 0 && (
              <div style={{marginTop:5,display:'flex',gap:4,flexWrap:'wrap'}}>
                {(showMore ? task.images : task.images.slice(0, 3)).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>
                    <img src={url} alt="" style={{width:36,height:36,objectFit:'cover',borderRadius:4,border:'1px solid var(--b1)'}}/>
                  </a>
                ))}
              </div>
            )}
            {(String(task.details||'').length>100 || (task.links&&task.links.length>2) || (task.images&&task.images.length>3)) && (
              <button type="button" onClick={e=>{e.stopPropagation();setShowMore(v=>!v)}}
                style={{marginTop:4,padding:0,border:'none',background:'none',color:'var(--ac)',fontSize:8,cursor:'pointer',fontFamily:'IBM Plex Mono,monospace'}}>
                {showMore ? '▲ less' : '▼ more'}
              </button>
            )}
          </div>
        )}
      </div>
      {hov && (
        <div style={{display:'flex',gap:3,flexShrink:0}}>
          <button type="button" title="Edit task" onClick={(e) => openEdit(e)}
            style={{width:16,height:16,borderRadius:3,border:'1px solid var(--b2)',background:'rgba(0,229,195,.06)',
              color:'var(--ac)',fontSize:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            ✎
          </button>
          <button type="button" onClick={e=>{e.stopPropagation();if(!del){setDel(true);setTimeout(()=>setDel(false),2500)}else onDelete(task.id)}}
            style={{width:16,height:16,borderRadius:3,border:`1px solid ${del?'rgba(248,113,113,.4)':'var(--b2)'}`,
              background:del?'rgba(248,113,113,.08)':'transparent',color:del?'#F87171':'var(--t3)',
              fontSize:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {del?'!':'×'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── ADD ROW ──────────────────────────────────────────────────────────────────
function AddRow({ area, onAdd, subtitleNames }) {
  const [open,setOpen]=useState(false)
  const [txt,setTxt]=useState('')
  const [sec,setSec]=useState('')
  const [owner,setOwner]=useState('CEO')
  const [pri,setPri]=useState('normal')
  const [tag,setTag]=useState('')
  const [details,setDetails]=useState('')
  const [links,setLinks]=useState([])
  const [images,setImages]=useState([])
  const [busy,setBusy]=useState(false)

  async function save() {
    if(!txt.trim())return
    setBusy(true)
    await onAdd({ area, txt:txt.trim(), sec:sec.trim()||'General', pri, tag:tag||null, owner:owner.trim()||'CEO', details, links, images })
    setTxt('');setSec('');setOwner('CEO');setPri('normal');setTag('');setDetails('');setLinks([]);setImages([]);setBusy(false);setOpen(false)
  }

  if(!open) return (
    <button onClick={()=>setOpen(true)} style={{width:'100%',padding:'5px 0',background:'transparent',
      border:'1px dashed var(--b2)',borderRadius:6,fontSize:8,color:'var(--t3)',cursor:'pointer',
      fontFamily:'DM Sans,sans-serif',marginTop:3,transition:'all .12s'}}
      onMouseEnter={e=>{e.target.style.borderColor='var(--ac)';e.target.style.color='var(--ac)'}}
      onMouseLeave={e=>{e.target.style.borderColor='var(--b2)';e.target.style.color='var(--t3)'}}>
      + add task
    </button>
  )

  const inp = {padding:'5px 8px',background:'var(--s2)',border:'1px solid var(--b2)',borderRadius:5,
    color:'var(--t1)',fontSize:9,fontFamily:'DM Sans,sans-serif',outline:'none',width:'100%'}

  const patchForm = (p) => {
    if (p._appendImage != null) {
      setImages((im) => [...im, p._appendImage])
      return
    }
    if (p._removeImageAt != null) {
      setImages((im) => im.filter((_, j) => j !== p._removeImageAt))
      return
    }
    if ('details' in p) setDetails(p.details)
    if ('links' in p) setLinks(p.links)
    if ('images' in p) setImages(p.images)
  }

  return (
    <div style={{background:'var(--s3)',border:'1px solid rgba(0,229,195,.25)',borderRadius:7,padding:8,marginTop:3}}>
      <label style={{fontSize:7,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace',display:'block',marginBottom:2}}>TITLE</label>
      <input autoFocus value={txt} onChange={e=>setTxt(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape')setOpen(false)}}
        placeholder="Task title…" style={{...inp,marginBottom:4}}/>
      <label style={{fontSize:7,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace',display:'block',marginBottom:2}}>SUBTITLE</label>
      <SubtitlePick value={sec} onChange={setSec} subtitleNames={subtitleNames} inp={inp} />
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:5}}>
        <input value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Owner" style={inp}/>
        <div/>
      </div>
      <div style={{display:'flex',gap:3,marginBottom:5}}>
        {['urgent','normal'].map(p=>(
          <button key={p} onClick={()=>setPri(p)} style={{padding:'2px 7px',borderRadius:4,
            border:`1px solid ${pri===p?(p==='urgent'?'rgba(248,113,113,.4)':'rgba(0,229,195,.3)'):'var(--b1)'}`,
            background:pri===p?(p==='urgent'?'rgba(248,113,113,.08)':'var(--ac1)'):'transparent',
            color:pri===p?(p==='urgent'?'#F87171':'var(--ac)'):'var(--t3)',
            fontSize:8,fontWeight:700,cursor:'pointer',fontFamily:'IBM Plex Mono,monospace',textTransform:'uppercase'}}>
            {p}
          </button>
        ))}
        <button onClick={()=>setTag(tag==='week'?'':'week')} style={{padding:'2px 7px',borderRadius:4,
          border:`1px solid ${tag==='week'?'rgba(251,191,36,.3)':'var(--b1)'}`,
          background:tag==='week'?'rgba(251,191,36,.08)':'transparent',
          color:tag==='week'?'#FBBF24':'var(--t3)',
          fontSize:8,fontWeight:700,cursor:'pointer',fontFamily:'IBM Plex Mono,monospace'}}>
          THIS WEEK
        </button>
      </div>
      <TaskExtrasForm details={details} links={links} images={images} disabled={busy} compact onPatch={patchForm}/>
      <div style={{display:'flex',gap:4,marginTop:6}}>
        <button onClick={save} disabled={busy||!txt.trim()} style={{flex:1,padding:'5px 0',
          background:busy||!txt.trim()?'var(--b2)':'var(--ac)',border:'none',borderRadius:5,
          color:busy||!txt.trim()?'var(--t3)':'var(--bg)',fontSize:9,fontWeight:700,cursor:'pointer',
          fontFamily:'IBM Plex Mono,monospace',display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
          {busy?<Loader/>:'ADD'}
        </button>
        <button onClick={()=>setOpen(false)} style={{padding:'5px 8px',background:'transparent',
          border:'1px solid var(--b2)',borderRadius:5,color:'var(--t3)',fontSize:9,cursor:'pointer'}}>✕</button>
      </div>
    </div>
  )
}

// ─── SUBTITLE (SECTION) MANAGER ───────────────────────────────────────────────
function SectionSubtitleModal({ area, areaName, names, onClose, onRename, onAdd, onDelete }) {
  const [renameFrom, setRenameFrom] = useState('')
  const [renameTo, setRenameTo] = useState('')
  const [newName, setNewName] = useState('')
  const [delName, setDelName] = useState('')
  const [delReassign, setDelReassign] = useState('General')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function doRename() {
    setErr(null)
    if (!renameFrom || !renameTo.trim()) return
    setBusy(true)
    try {
      await onRename(area, renameFrom, renameTo.trim())
      setRenameTo('')
      setRenameFrom('')
    } catch (e) {
      setErr(e.message || 'Rename failed')
    }
    setBusy(false)
  }

  async function doAdd() {
    setErr(null)
    if (!newName.trim()) return
    setBusy(true)
    try {
      await onAdd(area, newName.trim())
      setNewName('')
    } catch (e) {
      setErr(e.message || 'Add failed')
    }
    setBusy(false)
  }

  async function doDelete() {
    setErr(null)
    if (!delName) return
    setBusy(true)
    try {
      await onDelete(area, delName, delReassign.trim() || 'General')
      setDelName('')
      setDelReassign('General')
    } catch (e) {
      setErr(e.message || 'Delete failed')
    }
    setBusy(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.78)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 12, padding: 16, maxWidth: 440, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>Subtitles — {areaName}</div>
        <div style={{ fontSize: 8, color: 'var(--t3)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 12 }}>Create presets, rename (all matching tasks), or delete (reassign tasks if needed).</div>
        {err && <div style={{ fontSize: 9, color: 'var(--d)', marginBottom: 8 }}>{err}</div>}
        <label style={{ fontSize: 8, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Rename subtitle</label>
        <select value={renameFrom} onChange={(e) => setRenameFrom(e.target.value)} style={{ width: '100%', marginBottom: 6, padding: 8, borderRadius: 6, border: '1px solid var(--b2)', background: 'var(--s2)', color: 'var(--t1)', fontSize: 10, cursor: 'pointer' }}>
          <option value="">Select…</option>
          {(names || []).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} placeholder="New name" style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 6, border: '1px solid var(--b2)', background: 'var(--s2)', color: 'var(--t1)', fontSize: 10 }} />
        <button type="button" disabled={busy || !renameFrom || !renameTo.trim()} onClick={doRename} style={{ width: '100%', padding: 8, marginBottom: 14, borderRadius: 6, border: 'none', background: busy ? 'var(--b2)' : 'var(--ac)', color: 'var(--bg)', fontWeight: 700, fontSize: 10, cursor: busy ? 'default' : 'pointer' }}>
          {busy ? '…' : 'Apply rename'}
        </button>
        <label style={{ fontSize: 8, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Add preset subtitle</label>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. RTO Notifications" style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 6, border: '1px solid var(--b2)', background: 'var(--s2)', color: 'var(--t1)', fontSize: 10 }} />
        <button type="button" disabled={busy || !newName.trim()} onClick={doAdd} style={{ width: '100%', padding: 8, marginBottom: 14, borderRadius: 6, border: '1px solid var(--b2)', background: 'transparent', color: 'var(--ac)', fontWeight: 700, fontSize: 10, cursor: busy ? 'default' : 'pointer' }}>
          Add to list
        </button>
        <label style={{ fontSize: 8, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>Delete subtitle</label>
        <div style={{ fontSize: 8, color: 'var(--t3)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 6 }}>Removes from presets. If tasks use it, they are reassigned to the target below.</div>
        <select value={delName} onChange={(e) => setDelName(e.target.value)} style={{ width: '100%', marginBottom: 6, padding: 8, borderRadius: 6, border: '1px solid var(--b2)', background: 'var(--s2)', color: 'var(--t1)', fontSize: 10, cursor: 'pointer' }}>
          <option value="">Select…</option>
          {(names || []).map((n) => (
            <option key={`del-${n}`} value={n}>{n}</option>
          ))}
        </select>
        <input value={delReassign} onChange={(e) => setDelReassign(e.target.value)} placeholder="Reassign tasks to (e.g. General)" style={{ width: '100%', marginBottom: 8, padding: 8, borderRadius: 6, border: '1px solid var(--b2)', background: 'var(--s2)', color: 'var(--t1)', fontSize: 10 }} />
        <button
          type="button"
          disabled={busy || !delName || delName === (delReassign.trim() || 'General')}
          onClick={doDelete}
          style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 6, border: '1px solid rgba(248,113,113,.35)', background: busy ? 'var(--b2)' : 'rgba(248,113,113,.1)', color: '#F87171', fontWeight: 700, fontSize: 10, cursor: busy ? 'default' : 'pointer' }}
        >
          {busy ? '…' : 'Delete subtitle'}
        </button>
        <button type="button" onClick={onClose} style={{ width: '100%', padding: 6, borderRadius: 6, border: '1px solid var(--b2)', background: 'transparent', color: 'var(--t3)', fontSize: 9, cursor: 'pointer' }}>
          Close
        </button>
      </div>
    </div>
  )
}

// ─── AREA PANEL ───────────────────────────────────────────────────────────────
function AreaPanel({ area, tasks, filter, onToggle, onDelete, onEdit, onAdd, highlightIds, savingIds, subtitleNames, onSubtitleRename, onSubtitleAdd, onSubtitleDelete, onReorder }) {
  const [subOpen, setSubOpen] = useState(false)
  const dragTaskIdRef = useRef(null)
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  useEffect(() => {
    const clear = () => {
      dragTaskIdRef.current = null
      setDraggingId(null)
      setDragOverId(null)
      document.body.style.cursor = ''
    }
    window.addEventListener('dragend', clear)
    return () => window.removeEventListener('dragend', clear)
  }, [])

  const all = tasks.filter(t=>t.area===area.key)
  const vis = all.filter(t=>{
    if(filter==='done') return t.done
    if(filter==='urgent') return t.pri==='urgent'&&!t.done
    if(filter==='week') return t.tag==='week'&&!t.done
    return true
  })
  const donePct = all.length ? Math.round(all.filter(t=>t.done).length/all.length*100) : 0

  // Group by section
  const secs=[]
  vis.forEach(t=>{let s=secs.find(x=>x.n===t.sec);if(!s){s={n:t.sec,ts:[]};secs.push(s)};s.ts.push(t)})

  return (
    <div style={{background:'var(--s1)',border:`1px solid var(--b1)`,borderRadius:10,
      display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
      {/* Header */}
      <div style={{padding:'8px 11px',borderBottom:'1px solid var(--b1)',display:'flex',
        alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <span style={{fontSize:11,color:area.color}}>{AREA_ICONS[area.key]}</span>
          <span style={{fontSize:10,fontWeight:800,color:area.color,letterSpacing:'.6px',fontFamily:'IBM Plex Mono,monospace'}}>
            {area.name}
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <button type="button" onClick={()=>setSubOpen(true)}
            style={{padding:'2px 7px',borderRadius:4,border:'1px solid var(--b2)',background:'transparent',
              color:'var(--t3)',fontSize:7,fontWeight:700,cursor:'pointer',fontFamily:'IBM Plex Mono,monospace'}}
            title="Add or rename subtitles (sections)">
            Subs
          </button>
          <span style={{fontSize:8,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace'}}>{donePct}%</span>
          <span style={{fontSize:8,fontWeight:700,padding:'1px 6px',borderRadius:4,
            background:area.bg,color:area.color,border:`1px solid ${area.border}`,fontFamily:'IBM Plex Mono,monospace'}}>
            {vis.length}
          </span>
          {filter === 'all' && onReorder && (
            <span
              title="Grab the six-dot handle on the left edge of a card, then drop on another row in the same subtitle group."
              style={{
                fontSize: 6,
                color: 'var(--t3)',
                fontFamily: 'IBM Plex Mono, monospace',
                letterSpacing: '0.04em',
                maxWidth: 72,
                lineHeight: 1.2,
                textAlign: 'right',
              }}
            >
              drag ⋮⋮ to reorder
            </span>
          )}
        </div>
      </div>
      {/* Progress */}
      <div style={{height:2,background:'var(--b1)',flexShrink:0}}>
        <div style={{height:'100%',width:`${donePct}%`,background:area.color,transition:'width .4s'}}/>
      </div>
      {/* Body */}
      <div style={{flex:1,overflowY:'auto',padding:'6px 7px',minHeight:0}}>
        {subOpen && (
          <SectionSubtitleModal
            area={area.key}
            areaName={area.name}
            names={subtitleNames||[]}
            onClose={()=>setSubOpen(false)}
            onRename={onSubtitleRename}
            onAdd={onSubtitleAdd}
            onDelete={onSubtitleDelete}
          />
        )}
        {secs.length===0 && <div style={{fontSize:9,color:'var(--t3)',padding:'6px 2px'}}>No tasks in this view</div>}
        {secs.map(sec=>(
          <div key={sec.n}>
            <div
              style={{
                fontSize: 7,
                fontWeight: 700,
                letterSpacing: '1.2px',
                color: 'var(--t3)',
                textTransform: 'uppercase',
                padding: '5px 2px 3px',
                borderTop: '1px solid var(--b1)',
                marginTop: 2,
                fontFamily: 'IBM Plex Mono, monospace',
                display: 'flex',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              <span>{sec.n}</span>
              {filter === 'all' && onReorder && sec.ts.length > 1 && (
                <span style={{ fontSize: 6, fontWeight: 500, color: 'var(--t3)', opacity: 0.85, textTransform: 'none', letterSpacing: 0 }}>
                  same group · reorder with handle
                </span>
              )}
            </div>
            {sec.ts.map((task) => {
              const ids = sec.ts.map((t) => t.id)
              const reorder =
                filter === 'all' && onReorder
                  ? {
                      enabled: true,
                      draggingId,
                      dragOverId,
                      onDragStart: (id) => {
                        dragTaskIdRef.current = id
                        setDraggingId(id)
                        setDragOverId(null)
                        document.body.style.cursor = 'grabbing'
                      },
                      onDragOverTask: (id) => setDragOverId(id),
                      onDropOn: (targetId) => {
                        const dragged = dragTaskIdRef.current
                        dragTaskIdRef.current = null
                        setDraggingId(null)
                        setDragOverId(null)
                        document.body.style.cursor = ''
                        if (!dragged || dragged === targetId) return
                        const from = ids.indexOf(dragged)
                        const to = ids.indexOf(targetId)
                        if (from < 0 || to < 0) return
                        const nextIds = moveTaskIdInList(ids, from, to)
                        onReorder(area.key, sec.n, nextIds)
                      },
                    }
                  : null
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  saving={savingIds?.has(task.id)}
                  subtitleNames={subtitleNames}
                  reorder={reorder}
                  dimmed={highlightIds && highlightIds.size > 0 && !highlightIds.has(task.id)}
                />
              )
            })}
          </div>
        ))}
        <AddRow area={area.key} onAdd={onAdd} subtitleNames={subtitleNames}/>
      </div>
    </div>
  )
}

// ─── MEETING VIEW ─────────────────────────────────────────────────────────────
function MeetingView({tasks, onClose}) {
  const open = tasks.filter(t=>!t.done)
  const urgent = open.filter(t=>t.pri==='urgent')
  const icons = {software:'◈',hardware:'◉',business:'◆',operation:'◎'}
  const colors = {software:'#00E5C3',hardware:'#FB923C',business:'#60A5FA',operation:'#34D399'}

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',backdropFilter:'blur(8px)',
      zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'var(--s1)',border:'1px solid var(--b1)',borderRadius:14,
        width:'100%',maxWidth:680,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Header */}
        <div style={{padding:'14px 18px',borderBottom:'1px solid var(--b1)',display:'flex',
          justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,letterSpacing:'-.3px'}}>Meeting Brief</div>
            <div style={{fontSize:9,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace',marginTop:1}}>
              {new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </div>
          </div>
          <button onClick={onClose} style={{padding:'5px 10px',background:'transparent',
            border:'1px solid var(--b2)',borderRadius:6,color:'var(--t3)',fontSize:10,cursor:'pointer'}}>✕ Close</button>
        </div>
        {/* Stats strip */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,padding:'10px 14px',
          borderBottom:'1px solid var(--b1)',flexShrink:0}}>
          {[{l:'OPEN',v:open.length,c:'var(--t1)'},{l:'URGENT',v:urgent.length,c:'var(--d)'},
            {l:'THIS WEEK',v:open.filter(t=>t.tag==='week').length,c:'var(--w)'},
            {l:'DONE',v:tasks.filter(t=>t.done).length,c:'var(--g)'}].map(s=>(
            <div key={s.l} style={{padding:'6px 8px',background:'rgba(0,0,0,.2)',borderRadius:6}}>
              <div style={{fontSize:7,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace',letterSpacing:'1px',marginBottom:1}}>{s.l}</div>
              <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:'IBM Plex Mono,monospace'}}>{s.v}</div>
            </div>
          ))}
        </div>
        {/* Task list */}
        <div style={{flex:1,overflowY:'auto',padding:'10px 14px'}}>
          {['software','hardware','business','operation'].map(area=>{
            const ts = open.filter(t=>t.area===area)
            if(!ts.length) return null
            return (
              <div key={area} style={{marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                  <span style={{color:colors[area],fontSize:11}}>{icons[area]}</span>
                  <span style={{fontSize:10,fontWeight:800,color:colors[area],fontFamily:'IBM Plex Mono,monospace',letterSpacing:'.6px'}}>
                    {area.toUpperCase()}
                  </span>
                  <span style={{fontSize:8,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace'}}>
                    — {ts.length} open, {ts.filter(t=>t.pri==='urgent').length} urgent
                  </span>
                </div>
                {ts.map(t=>(
                  <div key={t.id} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:'1px solid var(--b1)'}}>
                    <span style={{fontSize:8,color:t.pri==='urgent'?'#F87171':'var(--t3)',fontFamily:'IBM Plex Mono,monospace',
                      minWidth:6,marginTop:2}}>
                      {t.pri==='urgent'?'●':'○'}
                    </span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:'var(--t1)',lineHeight:1.4}}>{t.txt}</div>
                      <div style={{fontSize:8,color:'var(--t3)',marginTop:1,fontFamily:'IBM Plex Mono,monospace'}}>
                        {t.sec} · {t.owner}
                      </div>
                    </div>
                    {t.tag==='week' && <span style={{fontSize:7,color:'#FBBF24',fontFamily:'IBM Plex Mono,monospace',alignSelf:'flex-start',marginTop:2}}>📅</span>}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({onTasksUpdate}) {
  const [msgs,setMsgs]=useState([
    {role:'assistant',content:"Hey Will 👋 I'm your CASAN task assistant.\n\nTry:\n• \"What's urgent this week?\"\n• \"Mark h1 done\"\n• \"Add hardware task: order more GPS units\"\n• **\"Meeting brief\"** → full digest\n• \"What did I finish today?\""}
  ])
  const [input,setInput]=useState('')
  const [loading,setLoading]=useState(false)
  const bottomRef=useRef(null)
  const inputRef=useRef(null)

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[msgs])

  const QUICK = [
    {l:'Urgent',q:'What are the urgent tasks?'},
    {l:'This week',q:'Show me this week tasks'},
    {l:'Meeting brief',q:'Give me the meeting brief'},
    {l:'Done today',q:'What tasks are done?'},
  ]

  async function send(text) {
    const msg = text || input.trim()
    if(!msg || loading) return
    setInput('')
    const history = msgs.slice(-8)
    setMsgs(m=>[...m,{role:'user',content:msg}])
    setLoading(true)
    try {
      const res = await api.chat(msg, history)
      setMsgs(m=>[...m,{role:'assistant',content:res.reply||'Done.'}])
      if(res.tasks) onTasksUpdate(res.tasks)
    } catch(e) {
      setMsgs(m=>[...m,{role:'assistant',content:'⚠️ Error: '+e.message}])
    }
    setLoading(false)
    setTimeout(()=>inputRef.current?.focus(),50)
  }

  function renderContent(content) {
    return content.split('\n').map((line,i)=>(
      <span key={i}>{line.replace(/\*\*(.*?)\*\*/g,(_,t)=>t)}<br/></span>
    ))
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'var(--s1)',
      border:'1px solid var(--b1)',borderRadius:10,overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'9px 12px',borderBottom:'1px solid var(--b1)',flexShrink:0,
        display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:7,height:7,borderRadius:'50%',background:'var(--ac)',
          boxShadow:'0 0 6px rgba(0,229,195,.4)',animation:'pulse 2s ease-in-out infinite'}}/>
        <span style={{fontSize:10,fontWeight:800,fontFamily:'IBM Plex Mono,monospace',color:'var(--ac)'}}>AI ASSISTANT</span>
        <span style={{fontSize:8,color:'var(--t3)',marginLeft:'auto',fontFamily:'IBM Plex Mono,monospace'}}>Claude-powered</span>
      </div>
      {/* Quick actions */}
      <div style={{padding:'6px 8px',borderBottom:'1px solid var(--b1)',display:'flex',gap:3,flexWrap:'wrap',flexShrink:0}}>
        {QUICK.map(q=>(
          <button key={q.l} onClick={()=>send(q.q)}
            style={{padding:'3px 8px',borderRadius:4,border:'1px solid var(--b1)',background:'transparent',
              color:'var(--t3)',fontSize:8,fontWeight:700,cursor:'pointer',fontFamily:'IBM Plex Mono,monospace',
              transition:'all .1s'}}
            onMouseEnter={e=>{e.target.style.borderColor='var(--ac)';e.target.style.color='var(--ac)'}}
            onMouseLeave={e=>{e.target.style.borderColor='var(--b1)';e.target.style.color='var(--t3)'}}>
            {q.l}
          </button>
        ))}
      </div>
      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'10px 10px 4px'}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{marginBottom:10,display:'flex',flexDirection:'column',
            alignItems:m.role==='user'?'flex-end':'flex-start'}}>
            <div style={{
              maxWidth:'88%',padding:'7px 10px',borderRadius:m.role==='user'?'8px 8px 2px 8px':'8px 8px 8px 2px',
              background:m.role==='user'?'rgba(0,229,195,.1)':'var(--s2)',
              border:`1px solid ${m.role==='user'?'rgba(0,229,195,.2)':'var(--b1)'}`,
              fontSize:9,color:m.role==='user'?'var(--ac)':'var(--t2)',lineHeight:1.55,
            }}>
              {renderContent(m.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 2px'}}>
            <Loader/>
            <span style={{fontSize:8,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace'}}>thinking...</span>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      {/* Input */}
      <div style={{padding:'8px',borderTop:'1px solid var(--b1)',flexShrink:0}}>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}}
            placeholder="Ask anything about your tasks..."
            style={{flex:1,padding:'7px 10px',background:'var(--s2)',border:'1px solid var(--b2)',
              borderRadius:7,color:'var(--t1)',fontSize:10,fontFamily:'DM Sans,sans-serif',outline:'none',
              transition:'border-color .12s'}}
            onFocus={e=>e.target.style.borderColor='var(--ac)'}
            onBlur={e=>e.target.style.borderColor='var(--b2)'}/>
          <button onClick={()=>send()} disabled={!input.trim()||loading}
            style={{width:32,height:32,borderRadius:7,border:'none',
              background:input.trim()&&!loading?'var(--ac)':'var(--b2)',
              color:input.trim()&&!loading?'var(--bg)':'var(--t3)',
              fontSize:13,cursor:input.trim()&&!loading?'pointer':'default',
              display:'flex',alignItems:'center',justifyContent:'center',transition:'all .12s',flexShrink:0}}>
            {loading?<Loader/>:'↑'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tasks,setTasks]=useState([])
  const [sections,setSections]=useState({})
  const [loading,setLoading]=useState(true)
  const [filter,setFilter]=useState('all')
  const [meeting,setMeeting]=useState(false)
  const [savingIds,setSavingIds]=useState(new Set())
  const [toast,setToast]=useState(null)
  const [chatOpen,setChatOpen]=useState(true)

  function showToast(msg,ok=true){setToast({msg,ok});setTimeout(()=>setToast(null),2500)}

  const reloadData = useCallback(async () => {
    const [t, sec] = await Promise.all([api.get(), api.sections()])
    setTasks(Array.isArray(t) ? t : [])
    setSections(sec.areas || {})
  }, [])

  useEffect(() => {
    reloadData().catch(() => {}).finally(() => setLoading(false))
  }, [reloadData])

  const handleSubtitleRename = useCallback(async (area, from, to) => {
    await api.sectionsRename(area, from, to)
    await reloadData()
    showToast('Subtitle renamed')
  }, [reloadData])

  const handleSubtitleAdd = useCallback(async (area, name) => {
    await api.sectionsAdd(area, name)
    await reloadData()
    showToast('Subtitle preset added')
  }, [reloadData])

  const handleSubtitleDelete = useCallback(async (area, name, reassignTo) => {
    await api.sectionsDelete(area, name, reassignTo)
    await reloadData()
    showToast('Subtitle deleted')
  }, [reloadData])

  const handleReorder = useCallback(async (area, sec, ids) => {
    try {
      const data = await api.tasksReorder(area, sec, ids)
      if (Array.isArray(data.tasks)) setTasks(data.tasks)
      showToast('Order saved')
    } catch {
      showToast('Reorder failed', false)
      reloadData().catch(() => {})
    }
  }, [reloadData])

  const handleToggle = useCallback(async(id,done)=>{
    setSavingIds(s=>new Set(s).add(id))
    setTasks(prev=>prev.map(t=>t.id===id?{...t,done}:t))
    try { await api.patch(id,{done}); showToast(done?'✓ Done':'↩ Reopened') }
    catch { setTasks(prev=>prev.map(t=>t.id===id?{...t,done:!done}:t)); showToast('Update failed',false) }
    finally { setSavingIds(s=>{const n=new Set(s);n.delete(id);return n}) }
  },[])

  const handleDelete = useCallback(async(id)=>{
    const prev=tasks
    setTasks(t=>t.filter(x=>x.id!==id))
    try { await api.delete(id); showToast('Deleted') }
    catch { setTasks(prev); showToast('Delete failed',false) }
  },[tasks])

  const handleAdd = useCallback(async(body)=>{
    const tmp={...body,id:`tmp_${Date.now()}`,done:false,details:body.details||'',links:body.links||[],images:body.images||[]}
    setTasks(prev=>[...prev,tmp])
    try {
      const created=await api.post(body)
      setTasks(prev=>prev.map(t=>t.id===tmp.id?created:t))
      showToast('Task added')
    } catch { setTasks(prev=>prev.filter(t=>t.id!==tmp.id)); showToast('Add failed',false) }
  },[])

  const handleEdit = useCallback(async (id, updates) => {
    let snapshot = null
    setSavingIds(s => new Set(s).add(id))
    setTasks(prev => {
      snapshot = prev.find(t => t.id === id)
      return prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    })
    try {
      const updated = await api.patch(id, updates)
      setTasks(prev => prev.map(t => (t.id === id ? updated : t)))
      showToast('Task updated')
      return true
    } catch {
      setTasks(prev => prev.map(t => (t.id === id ? (snapshot || t) : t)))
      showToast('Update failed', false)
      return false
    } finally {
      setSavingIds(s => { const n = new Set(s); n.delete(id); return n })
    }
  }, [])

  const handleTasksUpdate = useCallback((newTasks)=>{
    setTasks(newTasks)
    api.sections().then((s) => setSections(s.areas || {})).catch(() => {})
    showToast('Tasks updated by AI')
  },[])

  const open=tasks.filter(t=>!t.done)
  const FILTERS=[{k:'all',l:'ALL'},{k:'urgent',l:'URGENT'},{k:'week',l:'THIS WEEK'},{k:'done',l:'DONE'}]

  if(loading) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:10}}>
      <div style={{width:24,height:24,border:'2px solid var(--b2)',borderTopColor:'var(--ac)',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <span style={{fontSize:9,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace',letterSpacing:'1px'}}>LOADING TASKS...</span>
    </div>
  )

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',padding:'10px 12px',background:'var(--bg)',overflow:'hidden'}}>
      {/* ── HEADER ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
        paddingBottom:9,borderBottom:'1px solid var(--b1)',flexShrink:0,marginBottom:9,gap:8,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:30,height:30,borderRadius:7,background:'linear-gradient(135deg,#00E5C3,#00B4D8)',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,
            color:'var(--bg)',fontFamily:'IBM Plex Mono,monospace'}}>C</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,letterSpacing:'-.3px'}}>CEO Task Board</div>
            <div style={{fontSize:8,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace'}}>PT CASAN Energi Indonesia</div>
          </div>
        </div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
          {FILTERS.map(f=>(
            <button key={f.k} onClick={()=>setFilter(f.k)}
              style={{padding:'3px 8px',borderRadius:5,fontFamily:'IBM Plex Mono,monospace',
                border:`1px solid ${filter===f.k?'rgba(0,229,195,.3)':'var(--b1)'}`,
                background:filter===f.k?'var(--ac1)':'transparent',
                color:filter===f.k?'var(--ac)':'var(--t3)',fontSize:8,fontWeight:700,cursor:'pointer',transition:'all .12s'}}>
              {f.l}
            </button>
          ))}
          <div style={{width:1,height:14,background:'var(--b2)',margin:'0 2px'}}/>
          <button onClick={()=>setMeeting(true)}
            style={{padding:'3px 10px',borderRadius:5,border:'1px solid rgba(251,191,36,.3)',
              background:'rgba(251,191,36,.07)',color:'#FBBF24',fontSize:8,fontWeight:700,
              cursor:'pointer',fontFamily:'IBM Plex Mono,monospace'}}>
            📋 MEETING
          </button>
          <button onClick={()=>setChatOpen(c=>!c)}
            style={{padding:'3px 10px',borderRadius:5,
              border:`1px solid ${chatOpen?'rgba(0,229,195,.3)':'var(--b1)'}`,
              background:chatOpen?'var(--ac1)':'transparent',
              color:chatOpen?'var(--ac)':'var(--t3)',fontSize:8,fontWeight:700,
              cursor:'pointer',fontFamily:'IBM Plex Mono,monospace'}}>
            ◈ AI CHAT
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginBottom:9,flexShrink:0}}>
        {[{l:'OPEN',v:open.length,c:'var(--t1)'},{l:'URGENT',v:open.filter(t=>t.pri==='urgent').length,c:'var(--d)'},
          {l:'THIS WEEK',v:open.filter(t=>t.tag==='week').length,c:'var(--w)'},{l:'DONE',v:tasks.filter(t=>t.done).length,c:'var(--g)'}
        ].map(s=>(
          <div key={s.l} style={{padding:'6px 9px',background:'var(--s1)',border:'1px solid var(--b1)',borderRadius:7}}>
            <div style={{fontSize:7,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace',fontWeight:700,letterSpacing:'1px',marginBottom:2}}>{s.l}</div>
            <div style={{fontSize:16,fontWeight:800,color:s.c,fontFamily:'IBM Plex Mono,monospace'}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={{flex:1,minHeight:0,display:'grid',gap:8,
        gridTemplateColumns:chatOpen?'1fr 1fr 1fr 320px':'1fr 1fr',
        gridTemplateRows:chatOpen?'1fr':'1fr 1fr'}}>
        {chatOpen ? (
          <>
            {/* 2×2 grid of areas in left 3 cols */}
            <div style={{gridColumn:'1/4',display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:8,minHeight:0}}>
              {AREAS.map(area=>(
                <AreaPanel key={area.key} area={area} tasks={tasks} filter={filter}
                  onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} onAdd={handleAdd}
                  savingIds={savingIds} highlightIds={null}
                  subtitleNames={sections[area.key]||[]}
                  onSubtitleRename={handleSubtitleRename}
                  onSubtitleAdd={handleSubtitleAdd}
                  onSubtitleDelete={handleSubtitleDelete}
                  onReorder={handleReorder}/>
              ))}
            </div>
            {/* Chat on right */}
            <ChatPanel onTasksUpdate={handleTasksUpdate}/>
          </>
        ) : (
          AREAS.map(area=>(
            <AreaPanel key={area.key} area={area} tasks={tasks} filter={filter}
              onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} onAdd={handleAdd}
              savingIds={savingIds} highlightIds={null}
              subtitleNames={sections[area.key]||[]}
              onSubtitleRename={handleSubtitleRename}
              onSubtitleAdd={handleSubtitleAdd}
              onSubtitleDelete={handleSubtitleDelete}
              onReorder={handleReorder}/>
          ))
        )}
      </div>

      {/* Meeting modal */}
      {meeting && <MeetingView tasks={tasks} onClose={()=>setMeeting(false)}/>}

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',bottom:14,right:14,padding:'7px 14px',borderRadius:8,
          background:toast.ok?'var(--g1)':'var(--d1)',
          border:`1px solid ${toast.ok?'rgba(52,211,153,.15)':'rgba(248,113,113,.15)'}`,
          color:toast.ok?'var(--g)':'var(--d)',fontSize:10,fontWeight:600,
          animation:'fadeUp .15s ease',zIndex:9998}}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
