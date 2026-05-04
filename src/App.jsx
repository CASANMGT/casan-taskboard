import { useState, useEffect, useRef, useCallback } from 'react'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const AREAS = [
  { key:'software',  name:'SOFTWARE',  color:'#00E5C3', bg:'rgba(0,229,195,.08)',  border:'rgba(0,229,195,.18)'  },
  { key:'hardware',  name:'HARDWARE',  color:'#FB923C', bg:'rgba(251,146,60,.08)', border:'rgba(251,146,60,.18)' },
  { key:'business',  name:'BUSINESS',  color:'#60A5FA', bg:'rgba(96,165,250,.08)', border:'rgba(96,165,250,.18)' },
  { key:'operation', name:'OPERATION', color:'#34D399', bg:'rgba(52,211,153,.08)', border:'rgba(52,211,153,.18)' },
]
const AREA_ICONS = { software:'◈', hardware:'◉', business:'◆', operation:'◎' }

const api = {
  get:    ()         => fetch('/api/tasks').then(r=>r.json()),
  post:   (b)        => fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  patch:  (id,b)     => fetch(`/api/tasks/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json()),
  delete: (id)       => fetch(`/api/tasks/${id}`,{method:'DELETE'}).then(r=>r.json()),
  chat:   (msg,hist) => fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,history:hist})}).then(r=>r.json()),
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
function TaskCard({ task, onToggle, onDelete, dimmed }) {
  const [hov, setHov] = useState(false)
  const [del, setDel] = useState(false)
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);setDel(false)}}
      style={{...S.card(false,hov), opacity: dimmed ? .35 : task.done ? .45 : 1, marginBottom:3}}>
      <Checkbox checked={task.done} onChange={v=>onToggle(task.id,v)}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:9,fontWeight:600,color:task.done?'var(--t3)':'var(--t1)',lineHeight:1.45,textDecoration:task.done?'line-through':'none'}}>
          {task.txt}
        </div>
        <div style={{display:'flex',gap:3,alignItems:'center',marginTop:3,flexWrap:'wrap'}}>
          <PriBadge pri={task.pri}/><TagBadge tag={task.tag}/>
          <span style={{fontSize:7,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace'}}>{task.owner}</span>
        </div>
      </div>
      {hov && (
        <button onClick={e=>{e.stopPropagation();if(!del){setDel(true);setTimeout(()=>setDel(false),2500)}else onDelete(task.id)}}
          style={{width:16,height:16,borderRadius:3,border:`1px solid ${del?'rgba(248,113,113,.4)':'var(--b2)'}`,
            background:del?'rgba(248,113,113,.08)':'transparent',color:del?'#F87171':'var(--t3)',
            fontSize:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          {del?'!':'×'}
        </button>
      )}
    </div>
  )
}

// ─── ADD ROW ──────────────────────────────────────────────────────────────────
function AddRow({area, onAdd}) {
  const [open,setOpen]=useState(false)
  const [txt,setTxt]=useState('')
  const [sec,setSec]=useState('')
  const [pri,setPri]=useState('normal')
  const [tag,setTag]=useState('')
  const [busy,setBusy]=useState(false)

  async function save() {
    if(!txt.trim())return
    setBusy(true)
    await onAdd({area,txt:txt.trim(),sec:sec.trim()||'General',pri,tag:tag||null,owner:'CEO'})
    setTxt('');setSec('');setPri('normal');setTag('');setBusy(false);setOpen(false)
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

  return (
    <div style={{background:'var(--s3)',border:'1px solid rgba(0,229,195,.25)',borderRadius:7,padding:8,marginTop:3}}>
      <input autoFocus value={txt} onChange={e=>setTxt(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter')save();if(e.key==='Escape')setOpen(false)}}
        placeholder="Task description..." style={{...inp,marginBottom:4}}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:5}}>
        <input value={sec} onChange={e=>setSec(e.target.value)} placeholder="Section" style={inp}/>
        <input placeholder="Owner" defaultValue="CEO" style={inp}/>
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
      <div style={{display:'flex',gap:4}}>
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

// ─── AREA PANEL ───────────────────────────────────────────────────────────────
function AreaPanel({area, tasks, filter, onToggle, onDelete, onAdd, highlightIds}) {
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
          <span style={{fontSize:8,color:'var(--t3)',fontFamily:'IBM Plex Mono,monospace'}}>{donePct}%</span>
          <span style={{fontSize:8,fontWeight:700,padding:'1px 6px',borderRadius:4,
            background:area.bg,color:area.color,border:`1px solid ${area.border}`,fontFamily:'IBM Plex Mono,monospace'}}>
            {vis.length}
          </span>
        </div>
      </div>
      {/* Progress */}
      <div style={{height:2,background:'var(--b1)',flexShrink:0}}>
        <div style={{height:'100%',width:`${donePct}%`,background:area.color,transition:'width .4s'}}/>
      </div>
      {/* Body */}
      <div style={{flex:1,overflowY:'auto',padding:'6px 7px',minHeight:0}}>
        {secs.length===0 && <div style={{fontSize:9,color:'var(--t3)',padding:'6px 2px'}}>No tasks in this view</div>}
        {secs.map(sec=>(
          <div key={sec.n}>
            <div style={{fontSize:7,fontWeight:700,letterSpacing:'1.2px',color:'var(--t3)',textTransform:'uppercase',
              padding:'5px 2px 3px',borderTop:'1px solid var(--b1)',marginTop:2,fontFamily:'IBM Plex Mono,monospace'}}>
              {sec.n}
            </div>
            {sec.ts.map(task=>(
              <TaskCard key={task.id} task={task}
                onToggle={onToggle} onDelete={onDelete}
                dimmed={highlightIds && highlightIds.size>0 && !highlightIds.has(task.id)}/>
            ))}
          </div>
        ))}
        <AddRow area={area.key} onAdd={onAdd}/>
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
  const [loading,setLoading]=useState(true)
  const [filter,setFilter]=useState('all')
  const [meeting,setMeeting]=useState(false)
  const [savingIds,setSavingIds]=useState(new Set())
  const [toast,setToast]=useState(null)
  const [chatOpen,setChatOpen]=useState(true)

  useEffect(()=>{
    api.get().then(d=>{setTasks(Array.isArray(d)?d:[]);setLoading(false)})
      .catch(()=>setLoading(false))
  },[])

  function showToast(msg,ok=true){setToast({msg,ok});setTimeout(()=>setToast(null),2500)}

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
    const tmp={...body,id:`tmp_${Date.now()}`,done:false}
    setTasks(prev=>[...prev,tmp])
    try {
      const created=await api.post(body)
      setTasks(prev=>prev.map(t=>t.id===tmp.id?created:t))
      showToast('Task added')
    } catch { setTasks(prev=>prev.filter(t=>t.id!==tmp.id)); showToast('Add failed',false) }
  },[])

  const handleTasksUpdate = useCallback((newTasks)=>{
    setTasks(newTasks)
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
                  onToggle={handleToggle} onDelete={handleDelete} onAdd={handleAdd}
                  highlightIds={null}/>
              ))}
            </div>
            {/* Chat on right */}
            <ChatPanel onTasksUpdate={handleTasksUpdate}/>
          </>
        ) : (
          AREAS.map(area=>(
            <AreaPanel key={area.key} area={area} tasks={tasks} filter={filter}
              onToggle={handleToggle} onDelete={handleDelete} onAdd={handleAdd}
              highlightIds={null}/>
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
