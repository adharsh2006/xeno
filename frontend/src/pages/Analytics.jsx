import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { getCampaigns } from '../api'
import { channelConfig } from '../utils'

const COLORS = ['#534AB7', '#1D9E75', '#f59e0b', '#8b5cf6', '#f43f5e']

export default function Analytics() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCampaigns().then(res => {
      setCampaigns(res.data)
      setLoading(false)
    })
  }, [])

  // Build channel performance data
  const channelData = {}
  campaigns.forEach(c => {
    const ch = c.channel
    if (!channelData[ch]) channelData[ch] = { channel: ch, sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0 }
    channelData[ch].sent += c.total_sent || 0
    channelData[ch].delivered += c.total_delivered || 0
    channelData[ch].opened += c.total_opened || 0
    channelData[ch].clicked += c.total_clicked || 0
    channelData[ch].converted += c.total_converted || 0
  })
  const channelChartData = Object.values(channelData).map(d => ({
    ...d,
    channel: d.channel.charAt(0).toUpperCase() + d.channel.slice(1),
    openRate: d.sent > 0 ? +((d.opened / d.sent) * 100).toFixed(1) : 0,
    clickRate: d.sent > 0 ? +((d.clicked / d.sent) * 100).toFixed(1) : 0,
  }))

  // Campaign timeline
  const timelineData = campaigns
    .filter(c => c.total_sent > 0)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-10)
    .map(c => ({
      name: c.name.length > 16 ? c.name.substring(0, 16) + '...' : c.name,
      sent: c.total_sent,
      delivered: c.total_delivered,
      opened: c.total_opened,
      clicked: c.total_clicked,
      converted: c.total_converted,
    }))

  // Overall funnel
  const totalSent = campaigns.reduce((a, c) => a + (c.total_sent || 0), 0)
  const totalDelivered = campaigns.reduce((a, c) => a + (c.total_delivered || 0), 0)
  const totalOpened = campaigns.reduce((a, c) => a + (c.total_opened || 0), 0)
  const totalClicked = campaigns.reduce((a, c) => a + (c.total_clicked || 0), 0)
  const totalConverted = campaigns.reduce((a, c) => a + (c.total_converted || 0), 0)

  const funnelPieData = [
    { name: 'Delivered', value: totalDelivered },
    { name: 'Opened', value: totalOpened },
    { name: 'Clicked', value: totalClicked },
    { name: 'Converted', value: totalConverted },
  ].filter(d => d.value > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Sent', value: totalSent.toLocaleString('en-IN'), color: 'text-blue-600' },
          { label: 'Delivered', value: totalDelivered.toLocaleString('en-IN'), color: 'text-emerald-600' },
          { label: 'Opened', value: totalOpened.toLocaleString('en-IN'), color: 'text-purple-600' },
          { label: 'Clicked', value: totalClicked.toLocaleString('en-IN'), color: 'text-amber-600' },
          { label: 'Converted', value: totalConverted.toLocaleString('en-IN'), color: 'text-teal-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Channel Performance Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Channel Performance</h2>
          {channelChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={channelChartData} barSize={24}>
                <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name) => [v, name.charAt(0).toUpperCase() + name.slice(1)]} />
                <Bar dataKey="sent" fill="#534AB7" radius={[4, 4, 0, 0]} name="Sent" />
                <Bar dataKey="delivered" fill="#1D9E75" radius={[4, 4, 0, 0]} name="Delivered" />
                <Bar dataKey="opened" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Opened" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Funnel Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Overall Engagement</h2>
          {funnelPieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Launch a campaign to see data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={funnelPieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {funnelPieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Open rate & click rate by channel */}
      {channelChartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Open Rate & Click Rate by Channel (%)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={channelChartData} barSize={32}>
              <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="openRate" fill="#8b5cf6" name="Open Rate" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clickRate" fill="#f59e0b" name="Click Rate" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaign Comparison table */}
      {campaigns.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Campaign Comparison</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sent</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Open %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Click %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Conv %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.filter(c => c.total_sent > 0).map(c => {
                const sent = c.total_sent || 1
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">{(c.total_sent || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm text-purple-600 font-semibold text-right">{((c.total_opened / sent) * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm text-amber-600 font-semibold text-right">{((c.total_clicked / sent) * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm text-teal-600 font-semibold text-right">{((c.total_converted / sent) * 100).toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
