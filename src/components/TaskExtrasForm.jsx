import { useCallback, useRef } from 'react'

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export function TaskExtrasForm({ details, links, images, onPatch, disabled, compact }) {
  const dropRef = useRef(null)

  const setDetails = (v) => onPatch({ details: v })
  const setLinks = (next) => onPatch({ links: next })
  const appendImage = (url) => onPatch({ images: [...(images || []), url] })

  const addLink = () => onPatch({ links: [...(links || []), { url: '', label: '' }] })
  const setLink = (i, field, val) => {
    const next = [...(links || [])]
    next[i] = { ...next[i], [field]: val }
    onPatch({ links: next })
  }
  const removeLink = (i) => onPatch({ links: (links || []).filter((_, j) => j !== i) })

  const uploadOne = async (file) => {
    if (!file.type.startsWith('image/')) return
    const max = 1.5 * 1024 * 1024
    if (file.size > max) return
    const base64 = await readFileAsDataURL(file)
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, filename: file.name || 'image.png' }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Upload failed')
    if (data.url) onPatch({ _appendImage: data.url })
  }

  const onDrop = useCallback(
    async (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled) return
      const files = [...(e.dataTransfer?.files || [])]
      for (const f of files) {
        try {
          await uploadOne(f)
        } catch {
          /* skip */
        }
      }
    },
    [disabled, onPatch]
  )

  const onPasteUrl = (e) => {
    if (e.key === 'Enter') {
      const v = e.target.value.trim()
      if (!v) return
      if (v.startsWith('http://') || v.startsWith('https://')) {
        onPatch({ _appendImage: v })
        e.target.value = ''
      }
    }
  }

  const lab = compact
    ? { fontSize: 7, color: 'var(--t3)', fontFamily: 'IBM Plex Mono, monospace', display: 'block', marginBottom: 3 }
    : { fontSize: 8, color: 'var(--t3)', fontFamily: 'IBM Plex Mono, monospace', display: 'block', marginBottom: 4 }

  const inp = {
    padding: '5px 8px',
    background: 'var(--s2)',
    border: '1px solid var(--b2)',
    borderRadius: 5,
    color: 'var(--t1)',
    fontSize: 9,
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    width: '100%',
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <label style={lab}>DETAILS (notes, context)</label>
      <textarea
        value={details || ''}
        onChange={(e) => setDetails(e.target.value)}
        disabled={disabled}
        rows={compact ? 2 : 4}
        placeholder="Longer description, checklist, paste notes…"
        style={{ ...inp, resize: 'vertical', minHeight: compact ? 40 : 72, marginBottom: 8 }}
      />

      <label style={{ ...lab, marginTop: 4 }}>LINKS</label>
      {(links || []).map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 4, marginBottom: 4 }}>
          <input
            value={row.url || ''}
            onChange={(e) => setLink(i, 'url', e.target.value)}
            disabled={disabled}
            placeholder="https://…"
            style={inp}
          />
          <input
            value={row.label || ''}
            onChange={(e) => setLink(i, 'label', e.target.value)}
            disabled={disabled}
            placeholder="Label (optional)"
            style={inp}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => removeLink(i)}
            style={{ padding: '0 8px', borderRadius: 5, border: '1px solid var(--b2)', background: 'var(--s3)', color: 'var(--t3)', cursor: 'pointer', fontSize: 10 }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={addLink}
        style={{ marginBottom: 10, padding: '4px 10px', fontSize: 8, borderRadius: 5, border: '1px dashed var(--b2)', background: 'transparent', color: 'var(--t3)', cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace' }}
      >
        + add link
      </button>

      <label style={lab}>IMAGES</label>
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDrop={onDrop}
        style={{
          border: '2px dashed var(--b2)',
          borderRadius: 8,
          padding: 10,
          textAlign: 'center',
          fontSize: 8,
          color: 'var(--t3)',
          marginBottom: 6,
          background: 'rgba(0,0,0,.15)',
        }}
      >
        Drag & drop images here
        {disabled ? '' : ' (max ~1.5MB each)'}
      </div>
      <input
        type="text"
        disabled={disabled}
        placeholder="Paste image URL, press Enter"
        onKeyDown={onPasteUrl}
        style={{ ...inp, marginBottom: 8 }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(images || []).map((url, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img
              src={url}
              alt=""
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--b1)' }}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPatch({ _removeImageAt: i })}
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: 'none',
                background: 'var(--d)',
                color: '#fff',
                fontSize: 11,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
