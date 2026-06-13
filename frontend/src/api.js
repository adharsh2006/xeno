import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

// Customers
export const getCustomers = (params) => api.get('/customers', { params })
export const getCustomer = (id) => api.get(`/customers/${id}`)
export const importCustomers = (data) => api.post('/customers/import', data)

// Segments
export const getSegments = () => api.get('/segments')
export const createSegment = (data) => api.post('/segments', data)
export const previewSegment = (filter_criteria) => api.post('/segments/preview', { filter_criteria })
export const getSegmentCustomers = (id) => api.get(`/segments/${id}/customers`)

// Campaigns
export const getCampaigns = () => api.get('/campaigns')
export const getCampaign = (id) => api.get(`/campaigns/${id}`)
export const createCampaign = (data) => api.post('/campaigns', data)
export const launchCampaign = (id) => api.post(`/campaigns/${id}/launch`)
export const getCampaignStats = (id) => api.get(`/campaigns/${id}/stats`)
export const getCampaignLogs = (id, limit = 50) => api.get(`/campaigns/${id}/logs`, { params: { limit } })

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats')

// AI
export const aiSegment = (prompt) => api.post('/ai/segment', { prompt })
export const aiMessage = (data) => api.post('/ai/message', data)
export const aiInsights = (campaign_id) => api.post('/ai/insights', { campaign_id })
