/**
 * Format Indian Rupees
 */
export const formatINR = (amount) => {
  if (amount === null || amount === undefined) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Relative time formatter
 */
export const timeAgo = (dateString) => {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 30) return `${diffDay}d ago`
  if (diffMonth < 12) return `${diffMonth}mo ago`
  return `${Math.floor(diffMonth / 12)}y ago`
}

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

/**
 * Channel badge config
 */
export const channelConfig = {
  whatsapp: {
    label: 'WhatsApp',
    color: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  email: {
    label: 'Email',
    color: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  sms: {
    label: 'SMS',
    color: 'bg-purple-100 text-purple-700',
    dot: 'bg-purple-500',
  },
  rcs: {
    label: 'RCS',
    color: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
}

/**
 * Status badge config
 */
export const statusConfig = {
  sent: { color: 'bg-blue-100 text-blue-700', label: 'Sent' },
  delivered: { color: 'bg-green-100 text-green-700', label: 'Delivered' },
  failed: { color: 'bg-red-100 text-red-700', label: 'Failed' },
  opened: { color: 'bg-purple-100 text-purple-700', label: 'Opened' },
  clicked: { color: 'bg-amber-100 text-amber-700', label: 'Clicked' },
  converted: { color: 'bg-teal-100 text-teal-700', label: 'Converted' },
  draft: { color: 'bg-gray-100 text-gray-600', label: 'Draft' },
  running: { color: 'bg-green-100 text-green-700', label: 'Running' },
  completed: { color: 'bg-blue-100 text-blue-700', label: 'Completed' },
}

/**
 * Number formatter (1200 -> 1.2K)
 */
export const formatNumber = (n) => {
  if (!n) return '0'
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}
