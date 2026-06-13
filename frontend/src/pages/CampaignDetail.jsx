import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { RefreshCw, Sparkles, ArrowRight } from 'lucide-react'
import { getCampaign, getCampaignStats, getCampaignLogs, aiInsights } from '../api'
import { useCountUp, usePolling } from '../hooks/useAnimations'
import { channelConfig, statusConfig, timeAgo } from '../utils'

// Animated funnel stage card
function FunnelStage({ label, value, color, bgColor, isLast }) {
  const count = useCountUp(value, 800, true)
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${bgColor} rounded-2xl p-5 text-center border border-opacity-20`}>
        <div className={`text-2xl font-bold ${color} mb-1`}>{count.toLocaleString('en-IN')}</div>
        <div className="text-xs font-medium text-gray-500">{label}</div>
      </div>
      {!isLast && (
        <ArrowRight size={18} className="text-gray-300 flex-shrink-0" />
      )}
    </div>
  )
}

// Log status badge
function LogStatusBadge({ status }) {
  const cfg = statusConfig[status] || { color: 'bg-gray-100 text-gray-600', label: status }
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold badge-upgrade ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

export default function CampaignDetail() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [insights, setInsights] = useState('')
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const prevLogIds = useRef(new Set())

  const isRunning = campaign?.status === 'running'

  const loadData = async () => {
    try {
      const [campRes, statsRes, logsRes] = await Promise.all([
        getCampaign(id),
        getCampaignStats(id),
        getCampaignLogs(id, 50),
      ])
      setCampaign(campRes.data)
      setStats(statsRes.data)
      
      // Detect new rows
      const newLogs = logsRes.data.map(log => {
        const isNew = !prevLogIds.current.has(log.id)
        prevLogIds.current.add(log.id)
        return { ...log, isNew }
      })
      setLogs(newLogs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  usePolling(loadData, 3000, isRunning)

  useEffect(() => { loadData() }, [id])

  const loadInsights = async () => {
    setInsightsLoading(true)
    try {
      const res = await aiInsights(parseInt(id))
      setInsights(res.data.insights)
    } catch (err) {
      setInsights('Could not load insights. Please check your API key.')
    } finally {
      setInsightsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!campaign) {
    return <div className="text-center py-20 text-gray-400">Campaign not found</div>
  }

  const statusCfg = statusConfig[campaign.status] || { color: 'bg-gray-100 text-gray-600', label: campaign.status }
  const channelCfg = channelConfig[campaign.channel] || { label: campaign.channel, color: 'bg-gray-100 text-gray-600' }

  const funnelStages = [
    { label: 'Sent', value: stats?.total_sent || 0, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Delivered', value: stats?.total_delivered || 0, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { label: 'Opened', value: stats?.total_opened || 0, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { label: 'Clicked', value: stats?.total_clicked || 0, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { label: 'Converted', value: stats?.total_converted || 0, color: 'text-teal-600', bgColor: 'bg-teal-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
            {campaign.status === 'running' && (
              <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse" />
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${channelCfg.color}`}>
              {channelCfg.label}
            </span>
            <span className="text-xs text-gray-400">Launched {timeAgo(campaign.launched_at)}</span>
          </div>
        </div>
      </div>

      {/* Live Funnel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Campaign Funnel</h2>
          {isRunning && (
            <div className="flex items-center gap-1.5 text-xs text-accent-green font-medium">
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              Live updates every 3s
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {funnelStages.map((stage, i) => (
            <FunnelStage
              key={stage.label}
              {...stage}
              isLast={i === funnelStages.length - 1}
            />
          ))}
        </div>

        {/* Rate bars */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          {[
            { label: 'Delivery Rate', value: stats?.delivery_rate || 0, color: 'bg-emerald-400' },
            { label: 'Open Rate', value: stats?.open_rate || 0, color: 'bg-purple-400' },
            { label: 'Click Rate', value: stats?.click_rate || 0, color: 'bg-amber-400' },
            { label: 'Conversion Rate', value: stats?.conversion_rate || 0, color: 'bg-teal-400' },
          ].map(rate => (
            <div key={rate.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{rate.label}</span>
                <span className="font-semibold text-gray-800">{rate.value}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-[800ms] ease-out ${rate.color}`}
                  style={{ width: `${Math.min(rate.value, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary-500" />
            <h2 className="font-semibold text-gray-900">AI Insights</h2>
          </div>
          <button
            onClick={loadInsights}
            disabled={insightsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={13} className={insightsLoading ? 'animate-spin' : ''} />
            {insightsLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
        {insights ? (
          <p className="text-sm text-gray-700 leading-relaxed">{insights}</p>
        ) : (
          <p className="text-sm text-gray-400 italic">Click "Generate" to get AI-powered insights about this campaign's performance.</p>
        )}
      </div>

      {/* Campaign Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Message Logs</h2>
          <span className="text-xs text-gray-500">{logs.length} messages</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Message</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className={log.isNew ? 'log-row-new' : ''}>
                  <td className="px-6 py-3.5">
                    <div className="text-sm font-medium text-gray-900">{log.customer_name || `Customer #${log.customer_id}`}</div>
                    <div className="text-xs text-gray-400">{log.customer_email}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <LogStatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500 max-w-xs truncate">
                    {log.message_sent?.substring(0, 60)}...
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-400">
                    {timeAgo(log.updated_at)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                    No messages sent yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
