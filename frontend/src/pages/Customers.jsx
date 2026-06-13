import { useState, useEffect, useCallback } from 'react'
import { Search, Upload, X, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react'
import { getCustomers, getCustomer, importCustomers } from '../api'
import { useDebounce } from '../hooks/useAnimations'
import { getInitials, channelConfig, formatINR, timeAgo } from '../utils'
import { useToast } from '../context/ToastContext'

function ChannelBadge({ channel }) {
  const cfg = channelConfig[channel] || { label: channel, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function Avatar({ name, size = 'md' }) {
  const colors = [
    'bg-primary-500', 'bg-accent-green', 'bg-amber-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-teal-500'
  ]
  const color = colors[name?.charCodeAt(0) % colors.length] || colors[0]
  const sizeClass = size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {getInitials(name)}
    </div>
  )
}

// Customer drawer
function CustomerDrawer({ customerId, onClose }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customerId) return
    setLoading(true)
    getCustomer(customerId).then(res => {
      setCustomer(res.data)
      setLoading(false)
    })
  }, [customerId])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="drawer-enter relative w-96 bg-white h-full shadow-2xl overflow-y-auto z-10">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-semibold text-gray-900">Customer Profile</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customer ? (
          <div className="p-6 space-y-6">
            {/* Profile */}
            <div className="flex items-center gap-4">
              <Avatar name={customer.name} size="lg" />
              <div>
                <div className="font-semibold text-gray-900 text-lg">{customer.name}</div>
                <div className="text-sm text-gray-500">{customer.email}</div>
                <div className="text-sm text-gray-400">{customer.phone}</div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary-50 rounded-xl p-3">
                <div className="text-xs text-primary-600 font-medium">Total Spent</div>
                <div className="text-lg font-bold text-primary-700 mt-0.5">{formatINR(customer.total_spent)}</div>
              </div>
              <div className="bg-accent-green/10 rounded-xl p-3">
                <div className="text-xs text-accent-green font-medium">Last Purchase</div>
                <div className="text-sm font-semibold text-gray-700 mt-0.5">{timeAgo(customer.last_purchase_date)}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Preferred channel:</span>
              <ChannelBadge channel={customer.channel_preference} />
            </div>

            {/* Order History */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ShoppingBag size={16} className="text-gray-400" />
                Order History ({customer.orders?.length || 0})
              </h3>
              <div className="space-y-2">
                {customer.orders?.slice(0, 10).map(order => (
                  <div key={order.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.product_name}</div>
                      <div className="text-xs text-gray-400">{timeAgo(order.purchased_at)}</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-700">{formatINR(order.amount)}</div>
                  </div>
                ))}
                {(!customer.orders || customer.orders.length === 0) && (
                  <div className="text-sm text-gray-400 text-center py-4">No orders yet</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">Customer not found</div>
        )}
      </div>
    </div>
  )
}

// Import modal
function ImportModal({ onClose, onSuccess }) {
  const [json, setJson] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { addToast } = useToast()

  const handleImport = async () => {
    setError('')
    let data
    try {
      data = JSON.parse(json)
      if (!Array.isArray(data)) throw new Error('Must be an array')
    } catch (e) {
      setError('Invalid JSON. Please provide an array of customer objects.')
      return
    }

    setLoading(true)
    try {
      const res = await importCustomers(data)
      addToast(`Imported ${res.data.imported} customers successfully`, 'success')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[560px] p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Import Customers</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-3">Paste a JSON array of customer objects:</p>
        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 mb-3 font-mono">
          {`[{"name":"Priya Sharma","email":"priya@example.com","phone":"+91 9876543210","channel_preference":"whatsapp"}]`}
        </div>
        <textarea
          value={json}
          onChange={e => setJson(e.target.value)}
          className="w-full h-40 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
          placeholder="Paste JSON here..."
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !json.trim()}
            className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const debouncedSearch = useDebounce(search, 300)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCustomers({ page, per_page: 20, search: debouncedSearch || undefined })
      setCustomers(res.data.items)
      setTotal(res.data.total)
      setTotalPages(res.data.total_pages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [debouncedSearch])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{total.toLocaleString('en-IN')} total customers</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            <Upload size={15} />
            Import
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Channel</th>
              <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Spent</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Purchase</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-3.5"><div className="h-4 bg-gray-100 rounded w-40" /></td>
                  <td className="px-4 py-3.5"><div className="h-4 bg-gray-100 rounded w-28" /></td>
                  <td className="px-4 py-3.5"><div className="h-5 bg-gray-100 rounded-full w-20" /></td>
                  <td className="px-4 py-3.5"><div className="h-4 bg-gray-100 rounded w-16 ml-auto" /></td>
                  <td className="px-4 py-3.5"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                  <td className="px-4 py-3.5"><div className="h-4 bg-gray-100 rounded w-8 mx-auto" /></td>
                </tr>
              ))
            ) : customers.map(c => (
              <tr
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-400">{c.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-600">{c.phone}</td>
                <td className="px-4 py-3.5"><ChannelBadge channel={c.channel_preference} /></td>
                <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 text-right">{formatINR(c.total_spent)}</td>
                <td className="px-4 py-3.5 text-sm text-gray-500">{timeAgo(c.last_purchase_date)}</td>
                <td className="px-4 py-3.5 text-sm text-gray-600 text-center">{c.order_count}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {customers.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">No customers found</div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Drawer */}
      {selectedId && (
        <CustomerDrawer customerId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onSuccess={load} />
      )}
    </div>
  )
}
