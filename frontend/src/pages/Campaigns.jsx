import { useState, useEffect, useCallback, useLocation } from 'react'
import { Plus, X, Loader2, Check, Megaphone, MessageSquare, Mail, Phone, Wifi } from 'lucide-react'
import { getCampaigns, getSegments, createCampaign, launchCampaign, aiMessage } from '../api'
import { channelConfig, statusConfig, formatINR, timeAgo } from '../utils'
import { useToast } from '../context/ToastContext'
import { useNavigate, useLocation as useReactLocation } from 'react-router-dom'

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', activeColor: 'border-emerald-500 bg-emerald-50' },
  { id: 'email', label: 'Email', icon: Mail, color: 'bg-blue-50 border-blue-200 text-blue-700', activeColor: 'border-blue-500 bg-blue-50' },
  { id: 'sms', label: 'SMS', icon: Phone, color: 'bg-purple-50 border-purple-200 text-purple-700', activeColor: 'border-purple-500 bg-purple-50' },
  { id: 'rcs', label: 'RCS', icon: Wifi, color: 'bg-amber-50 border-amber-200 text-amber-700', activeColor: 'border-amber-500 bg-amber-50' },
]

function ChannelBadge({ channel }) {
  const cfg = channelConfig[channel] || { label: channel, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// Mini funnel for campaign card
function MiniFunnel({ campaign }) {
  const sent = campaign.total_sent || 0
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="text-blue-600 font-semibold">{sent}</span>
      <span>→</span>
      <span className="text-emerald-600 font-semibold">{campaign.total_delivered || 0}</span>
      <span>→</span>
      <span className="text-purple-600 font-semibold">{campaign.total_opened || 0}</span>
      <span>→</span>
      <span className="text-amber-600 font-semibold">{campaign.total_clicked || 0}</span>
      <span>→</span>
      <span className="text-teal-600 font-semibold">{campaign.total_converted || 0}</span>
    </div>
  )
}

// 4-step Create Campaign Modal
function CreateCampaignModal({ onClose, onCreated, defaultSegmentId }) {
  const [step, setStep] = useState(1)
  const [segments, setSegments] = useState([])
  const [selectedSegment, setSelectedSegment] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [message, setMessage] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launched, setLaunched] = useState(false)
  const { addToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    getSegments().then(res => {
      setSegments(res.data)
      if (defaultSegmentId) {
        const seg = res.data.find(s => s.id === defaultSegmentId)
        if (seg) { setSelectedSegment(seg); setStep(2) }
      }
    })
  }, [defaultSegmentId])

  const handleAIDraft = async () => {
    if (!selectedSegment || !selectedChannel) return
    setAiLoading(true)
    try {
      // Get first customer of segment for preview
      const res = await aiMessage({
        customer_id: 1, // placeholder - will personalize per customer on launch
        channel: selectedChannel,
        campaign_context: campaignName || selectedSegment.name,
      })
      setMessage(res.data.message)
    } catch (err) {
      addToast('AI draft failed', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const handleLaunch = async () => {
    if (!selectedSegment || !selectedChannel || !message || !campaignName) return
    setLaunching(true)
    try {
      const campRes = await createCampaign({
        name: campaignName,
        segment_id: selectedSegment.id,
        message_template: message,
        channel: selectedChannel,
      })
      await launchCampaign(campRes.data.id)
      setLaunched(true)
      addToast('Campaign launched! 🚀', 'success')
      setTimeout(() => {
        onCreated()
        onClose()
        navigate(`/campaigns/${campRes.data.id}`)
      }, 1500)
    } catch (err) {
      addToast(err.response?.data?.detail || 'Launch failed', 'error')
    } finally {
      setLaunching(false)
    }
  }

  const canNext = () => {
    if (step === 1) return !!selectedSegment
    if (step === 2) return !!selectedChannel
    if (step === 3) return !!message.trim()
    if (step === 4) return !!campaignName.trim()
    return false
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[580px] max-h-[90vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Create Campaign</h2>
            <div className="flex items-center gap-2 mt-2">
              {[1,2,3,4].map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${step >= s ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {step > s ? <Check size={12} /> : s}
                  </div>
                  {s < 4 && <div className={`w-6 h-0.5 rounded ${step > s ? 'bg-primary-500' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6">
          {/* Step 1: Pick Segment */}
          {step === 1 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 mb-3">Select Audience Segment</h3>
              {segments.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-8">No segments available. Create one first.</div>
              )}
              {segments.map(seg => (
                <div
                  key={seg.id}
                  onClick={() => setSelectedSegment(seg)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${selectedSegment?.id === seg.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{seg.name}</div>
                    {seg.description && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{seg.description}</div>}
                  </div>
                  <div className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                    {seg.customer_count.toLocaleString('en-IN')} customers
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Choose Channel */}
          {step === 2 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 mb-3">Choose Channel</h3>
              <div className="grid grid-cols-2 gap-3">
                {CHANNELS.map(ch => {
                  const Icon = ch.icon
                  return (
                    <div
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch.id)}
                      className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 cursor-pointer transition-all
                        ${selectedChannel === ch.id ? `border-2 ${ch.activeColor}` : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <Icon size={24} className={selectedChannel === ch.id ? 'text-gray-700' : 'text-gray-400'} />
                      <span className={`font-semibold text-sm ${selectedChannel === ch.id ? 'text-gray-900' : 'text-gray-500'}`}>{ch.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Compose Message */}
          {step === 3 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 mb-3">Compose Message</h3>
              <p className="text-xs text-gray-500">Use <code className="bg-gray-100 px-1 py-0.5 rounded">{'{name}'}</code> for personalization</p>
              <button
                onClick={handleAIDraft}
                disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-primary-300 text-primary-600 rounded-xl text-sm font-medium hover:bg-primary-50 transition-colors"
              >
                {aiLoading ? <Loader2 size={15} className="animate-spin" /> : '✨'}
                {aiLoading ? 'Drafting with AI...' : 'AI Draft Message'}
              </button>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your message here..."
                className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              />
            </div>
          )}

          {/* Step 4: Review + Launch */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 mb-3">Review & Launch</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="e.g. June Re-engagement Push"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Segment</span>
                  <span className="font-medium">{selectedSegment?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Audience</span>
                  <span className="font-medium">{selectedSegment?.customer_count.toLocaleString('en-IN')} customers</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Channel</span>
                  <ChannelBadge channel={selectedChannel} />
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-gray-500 mb-1">Message Preview</div>
                  <div className="text-gray-800 text-xs bg-white rounded-lg p-2 border border-gray-200">
                    {message.substring(0, 120)}{message.length > 120 ? '...' : ''}
                  </div>
                </div>
              </div>

              {/* Launch button */}
              <button
                onClick={handleLaunch}
                disabled={launching || !campaignName.trim() || launched}
                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
                  ${launched ? 'bg-accent-green text-white' : 'bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-40'}`}
              >
                {launched ? (
                  <><Check size={18} className="checkmark-appear" /> Campaign Launched!</>
                ) : launching ? (
                  <><Loader2 size={16} className="animate-spin" /> Launching...</>
                ) : (
                  <><Megaphone size={16} /> Launch Campaign</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer nav */}
        {!launched && (
          <div className="flex justify-between px-6 pb-6">
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-0 transition-colors"
            >
              Back
            </button>
            {step < 4 && (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const location = useReactLocation()
  const navigate = useNavigate()

  // Handle redirect from Segments page with pre-selected segment
  const defaultSegmentId = location.state?.segmentId

  useEffect(() => {
    if (defaultSegmentId) setShowCreate(true)
  }, [defaultSegmentId])

  const load = useCallback(async () => {
    try {
      const res = await getCampaigns()
      setCampaigns(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const running = campaigns.filter(c => c.status === 'running')
  const allClicks = campaigns.reduce((a, c) => a + (c.total_clicked || 0), 0)
  const allSent = campaigns.reduce((a, c) => a + (c.total_sent || 0), 0)
  const avgClickRate = allSent > 0 ? ((allClicks / allSent) * 100).toFixed(1) : 0

  // Best channel
  const channelMap = {}
  campaigns.forEach(c => {
    if (!channelMap[c.channel]) channelMap[c.channel] = { sent: 0, opened: 0 }
    channelMap[c.channel].sent += c.total_sent || 0
    channelMap[c.channel].opened += c.total_opened || 0
  })
  const bestChannel = Object.entries(channelMap).sort((a, b) => {
    const rateA = a[1].sent > 0 ? a[1].opened / a[1].sent : 0
    const rateB = b[1].sent > 0 ? b[1].opened / b[1].sent : 0
    return rateB - rateA
  })[0]?.[0] || '—'

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: campaigns.length },
          { label: 'Running Now', value: running.length, accent: true },
          { label: 'Avg Click Rate', value: `${avgClickRate}%` },
          { label: 'Best Channel', value: bestChannel.charAt(0).toUpperCase() + bestChannel.slice(1) },
        ].map((stat, i) => (
          <div key={i} className={`rounded-2xl px-5 py-4 border ${stat.accent ? 'bg-accent-green/10 border-accent-green/20' : 'bg-white border-gray-100'}`}>
            <div className="text-xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{campaigns.length} campaigns</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-20 text-center">
            <Megaphone size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No campaigns yet</p>
            <p className="text-sm text-gray-300 mt-1">Create your first campaign to reach shoppers</p>
          </div>
        ) : campaigns.map(c => {
          const statusCfg = statusConfig[c.status] || { color: 'bg-gray-100 text-gray-600', label: c.status }
          return (
            <div
              key={c.id}
              onClick={() => navigate(`/campaigns/${c.id}`)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md cursor-pointer transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    {c.status === 'running' && (
                      <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <ChannelBadge channel={c.channel} />
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                    <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                  </div>
                  <MiniFunnel campaign={c} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
          defaultSegmentId={defaultSegmentId}
        />
      )}
    </div>
  )
}
