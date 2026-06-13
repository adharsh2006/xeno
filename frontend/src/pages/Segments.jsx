import { useState, useEffect, useCallback } from 'react'
import { Plus, Sparkles, Filter, Users, Tag, X, Loader2 } from 'lucide-react'
import { getSegments, createSegment, previewSegment, aiSegment } from '../api'
import { channelConfig, timeAgo } from '../utils'
import { useToast } from '../context/ToastContext'
import { useNavigate } from 'react-router-dom'

const FILTER_FIELDS = [
  { key: 'min_spent', label: 'Min Spend (₹)', type: 'number', placeholder: '5000' },
  { key: 'max_spent', label: 'Max Spend (₹)', type: 'number', placeholder: '15000' },
  { key: 'days_active', label: 'Active within (days)', type: 'number', placeholder: '30' },
  { key: 'days_inactive', label: 'Inactive for (days)', type: 'number', placeholder: '90' },
  { key: 'min_orders', label: 'Min Orders', type: 'number', placeholder: '3' },
  { key: 'max_orders', label: 'Max Orders', type: 'number', placeholder: '20' },
  { key: 'channel_preference', label: 'Channel', type: 'select', options: ['whatsapp', 'email', 'sms', 'rcs'] },
]

function FilterTag({ label }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-xs font-medium">
      <Tag size={10} />
      {label}
    </span>
  )
}

function SegmentCard({ segment, index, onLaunch }) {
  const filters = segment.filter_criteria || {}
  const filterTags = Object.entries(filters).map(([k, v]) => {
    const field = FILTER_FIELDS.find(f => f.key === k)
    return field ? `${field.label}: ${v}` : `${k}: ${v}`
  })

  return (
    <div
      className="stagger-card bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{segment.name}</h3>
          {segment.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{segment.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-primary-50 text-primary-600 px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0">
          <Users size={12} />
          {segment.customer_count.toLocaleString('en-IN')}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {filterTags.slice(0, 3).map((tag, i) => (
          <FilterTag key={i} label={tag} />
        ))}
        {filterTags.length > 3 && (
          <span className="text-xs text-gray-400">+{filterTags.length - 3} more</span>
        )}
        {filterTags.length === 0 && (
          <span className="text-xs text-gray-400">All customers</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{timeAgo(segment.created_at)}</span>
        <button
          onClick={() => onLaunch(segment)}
          className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs font-semibold hover:bg-primary-600 transition-colors"
        >
          Launch Campaign
        </button>
      </div>
    </div>
  )
}

// AI Create Panel
function AISegmentPanel({ onCreated }) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()
  const [highlightCount, setHighlightCount] = useState(false)

  const handleAI = async () => {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setResult(null)
    try {
      const res = await aiSegment(prompt)
      setResult(res.data)
      // Flash highlight on count
      setHighlightCount(true)
      setTimeout(() => setHighlightCount(false), 600)
    } catch (err) {
      addToast('AI request failed. Check your API key.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !result) return
    setSaving(true)
    try {
      await createSegment({
        name,
        description: prompt,
        filter_criteria: result.filter_criteria,
      })
      addToast(`Segment "${name}" created!`, 'success')
      setResult(null)
      setPrompt('')
      setName('')
      onCreated()
    } catch (err) {
      addToast('Failed to save segment', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Describe your audience</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g. Customers who spent over ₹5000 but haven't bought in 60 days"
          className="w-full h-24 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
        />
      </div>
      <button
        onClick={handleAI}
        disabled={loading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-40 transition-colors"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? 'Analyzing...' : 'Generate with AI'}
      </button>

      {result && (
        <div className="space-y-3 animate-fade-in">
          <div className={`bg-primary-50 border border-primary-200 rounded-xl p-3 transition-all ${highlightCount ? 'ring-2 ring-primary-400' : ''}`}>
            <div className="text-xs text-primary-600 font-medium mb-1">AI Result</div>
            <p className="text-sm text-gray-700">{result.explanation}</p>
            <div className="mt-2 text-primary-700 font-bold text-sm">
              {result.customer_count.toLocaleString('en-IN')} customers match
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Segment Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. High Spenders - Lapsed 60d"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full py-2.5 bg-accent-green text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Saving...' : '✓ Confirm & Save Segment'}
          </button>
        </div>
      )}
    </div>
  )
}

// Manual Create Panel
function ManualSegmentPanel({ onCreated }) {
  const [form, setForm] = useState({})
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  const buildCriteria = () => {
    const c = {}
    FILTER_FIELDS.forEach(f => {
      if (form[f.key] !== undefined && form[f.key] !== '') {
        c[f.key] = f.type === 'number' ? Number(form[f.key]) : form[f.key]
      }
    })
    return c
  }

  const handlePreview = async () => {
    const criteria = buildCriteria()
    setPreviewLoading(true)
    try {
      const res = await previewSegment(criteria)
      setPreview(res.data)
    } catch (err) {
      addToast('Preview failed', 'error')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createSegment({ name, filter_criteria: buildCriteria() })
      addToast(`Segment "${name}" created!`, 'success')
      setForm({})
      setName('')
      setPreview(null)
      onCreated()
    } catch (err) {
      addToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {FILTER_FIELDS.map(field => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
            {field.type === 'select' ? (
              <select
                value={form[field.key] || ''}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">Any</option>
                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type="number"
                value={form[field.key] || ''}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handlePreview}
        disabled={previewLoading}
        className="w-full flex items-center justify-center gap-2 py-2 border border-primary-300 text-primary-600 rounded-xl text-sm font-medium hover:bg-primary-50 transition-colors"
      >
        {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />}
        Preview
      </button>

      {preview && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-3">
          <div className="text-primary-700 font-bold text-sm">
            {preview.count.toLocaleString('en-IN')} customers match
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Segment Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Segment name..."
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="w-full py-2.5 bg-accent-green text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save Segment'}
      </button>
    </div>
  )
}

export default function Segments() {
  const [segments, setSegments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('ai') // 'ai' | 'manual'
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const res = await getSegments()
      setSegments(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleLaunch = (segment) => {
    navigate('/campaigns', { state: { segmentId: segment.id, segmentName: segment.name } })
  }

  return (
    <div className="flex gap-6">
      {/* Left: Segment Cards Grid */}
      <div className="flex-1 space-y-5">
        <div>
          <p className="text-sm text-gray-500">{segments.length} saved segments</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="h-5 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : segments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No segments yet</p>
            <p className="text-sm text-gray-300 mt-1">Create your first segment using AI or manual filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {segments.map((seg, i) => (
              <SegmentCard key={seg.id} segment={seg} index={i} onLaunch={handleLaunch} />
            ))}
          </div>
        )}
      </div>

      {/* Right: Create Panel */}
      <div className="w-80 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-0">
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">Create Segment</h2>
            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setTab('ai')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${tab === 'ai' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
              >
                <Sparkles size={12} />
                AI
              </button>
              <button
                onClick={() => setTab('manual')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${tab === 'manual' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
              >
                <Filter size={12} />
                Manual
              </button>
            </div>
          </div>
          <div className="p-5">
            {tab === 'ai' ? (
              <AISegmentPanel onCreated={load} />
            ) : (
              <ManualSegmentPanel onCreated={load} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
