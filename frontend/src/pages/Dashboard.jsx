import { useState, useEffect, useRef } from 'react'
import { Users, Megaphone, TrendingUp, IndianRupee, RefreshCw, Send, Sparkles } from 'lucide-react'
import { getDashboardStats, getCampaigns, getCampaignStats, aiSegment, aiMessage } from '../api'
import { useCountUp, usePolling } from '../hooks/useAnimations'
import { channelConfig, statusConfig, formatINR, formatNumber } from '../utils'

// Metric Card with count-up
function MetricCard({ icon: Icon, label, value, prefix = '', suffix = '', color, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  const displayVal = useCountUp(value || 0, 1000, visible)

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
      style={{ animationDelay: `${delay}ms` }}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {prefix}{displayVal.toLocaleString('en-IN')}{suffix}
      </div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  )
}

// Channel badge
function ChannelBadge({ channel }) {
  const cfg = channelConfig[channel] || { label: channel, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// Funnel bar component
function FunnelBar({ label, value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900">{value.toLocaleString('en-IN')} ({pct.toFixed(1)}%)</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-[800ms] ease-out ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

// AI Chat message
function ChatMessage({ msg }) {
  return (
    <div className={`chat-message flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
        ${msg.role === 'user' 
          ? 'bg-primary-500 text-white rounded-br-md' 
          : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
        {msg.content}
      </div>
    </div>
  )
}

// Typing indicator
function TypingIndicator() {
  return (
    <div className="chat-message flex justify-start">
      <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="typing-dot w-2 h-2 bg-gray-400 rounded-full" />
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [funnelStats, setFunnelStats] = useState(null)
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', content: "Hi! I'm your AI Copilot. Describe a customer segment and I'll help you find them and draft a campaign message." }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  const loadStats = async () => {
    try {
      const [statsRes, campaignsRes] = await Promise.all([
        getDashboardStats(),
        getCampaigns(),
      ])
      setStats(statsRes.data)
      setCampaigns(campaignsRes.data)

      // Aggregate funnel across all campaigns
      const all = campaignsRes.data
      if (all.length > 0) {
        const agg = all.reduce((acc, c) => ({
          sent: acc.sent + (c.total_sent || 0),
          delivered: acc.delivered + (c.total_delivered || 0),
          opened: acc.opened + (c.total_opened || 0),
          clicked: acc.clicked + (c.total_clicked || 0),
          converted: acc.converted + (c.total_converted || 0),
        }), { sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 })
        setFunnelStats(agg)
      }
    } catch (err) {
      console.error('Failed to load dashboard stats', err)
    }
  }

  usePolling(loadStats, 5000, true)

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return
    const prompt = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: prompt }])
    setChatLoading(true)

    try {
      const segRes = await aiSegment(prompt)
      const { filter_criteria, explanation, customer_count } = segRes.data
      
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: `${explanation}\n\nFound **${customer_count}** matching customers.`
      }])

      if (customer_count > 0) {
        // Generate a sample message
        setChatMessages(prev => [...prev, { 
          role: 'ai', 
          content: `Here's a sample message for this segment:\n\n✍️ Generating personalized draft...` 
        }])
        
        setTimeout(() => {
          setChatMessages(prev => [...prev, {
            role: 'ai',
            content: `✅ Ready to launch! Go to **Segments** to save this audience (${customer_count} customers) and create a campaign.`
          }])
        }, 1000)
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'ai',
        content: '❌ Sorry, I encountered an error. Please check your API key configuration.'
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'running')

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-5">
        <MetricCard icon={Users} label="Total Shoppers" value={stats?.total_customers} color="bg-primary-500" delay={0} />
        <MetricCard icon={Megaphone} label="Campaigns Sent" value={stats?.total_campaigns} color="bg-accent-green" delay={100} />
        <MetricCard icon={TrendingUp} label="Avg Open Rate" value={Math.round(stats?.avg_open_rate || 0)} suffix="%" color="bg-amber-500" delay={200} />
        <MetricCard icon={IndianRupee} label="Revenue Driven" value={stats?.revenue_driven} prefix="₹" color="bg-purple-500" delay={300} />
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left: Active Campaigns + Funnel */}
        <div className="col-span-3 space-y-6">
          {/* Active Campaigns */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Active Campaigns</h2>
              <span className="text-xs text-gray-500">{activeCampaigns.length} running</span>
            </div>
            <div className="divide-y divide-gray-50">
              {activeCampaigns.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">
                  No active campaigns. Launch one to get started.
                </div>
              ) : (
                activeCampaigns.map(c => {
                  const deliveryPct = c.total_sent > 0 
                    ? ((c.total_delivered / c.total_sent) * 100).toFixed(1) 
                    : 0
                  return (
                    <div key={c.id} className="flex items-center justify-between px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                        <span className="text-sm font-medium text-gray-900">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ChannelBadge channel={c.channel} />
                        <span className="text-xs text-gray-500">{deliveryPct}% delivered</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Campaign Funnel */}
          {funnelStats && funnelStats.sent > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Overall Campaign Funnel</h2>
              <div className="space-y-3">
                <FunnelBar label="Sent" value={funnelStats.sent} total={funnelStats.sent} color="bg-blue-400" />
                <FunnelBar label="Delivered" value={funnelStats.delivered} total={funnelStats.sent} color="bg-accent-green" />
                <FunnelBar label="Opened" value={funnelStats.opened} total={funnelStats.sent} color="bg-purple-400" />
                <FunnelBar label="Clicked" value={funnelStats.clicked} total={funnelStats.sent} color="bg-amber-400" />
                <FunnelBar label="Converted" value={funnelStats.converted} total={funnelStats.sent} color="bg-teal-400" />
              </div>
            </div>
          )}
        </div>

        {/* Right: AI Copilot Chat */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ maxHeight: '520px' }}>
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Sparkles size={16} className="text-primary-500" />
            <h2 className="font-semibold text-gray-900">AI Copilot</h2>
            <div className="ml-auto w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {chatMessages.map((msg, i) => (
              <ChatMessage key={i} msg={msg} />
            ))}
            {chatLoading && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                placeholder="e.g. customers who spent over ₹5000..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                disabled={chatLoading}
              />
              <button
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="w-9 h-9 bg-primary-500 text-white rounded-xl flex items-center justify-center hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
