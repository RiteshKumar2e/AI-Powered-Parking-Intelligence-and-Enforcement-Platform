import apiClient from './client'
import type { Violation, Camera, Zone, Report, PaginatedResponse, DashboardSummary, HeatmapPoint, Prediction } from '../types'

// Auth
export const login = (username: string, password: string) =>
  apiClient.post('/auth/login', { username, password }).then(r => r.data)

// Dashboard
export const getDashboardSummary = (): Promise<DashboardSummary> =>
  apiClient.get('/dashboard/summary').then(r => r.data)

export const getRecentViolations = (limit = 10) =>
  apiClient.get(`/dashboard/recent-violations?limit=${limit}`).then(r => r.data)

export const getViolationTrend = (days = 7) =>
  apiClient.get(`/dashboard/violation-trend?days=${days}`).then(r => r.data)

export const getTopZones = (limit = 5, hoursBack = 24) =>
  apiClient.get(`/dashboard/top-zones?limit=${limit}&hours_back=${hoursBack}`).then(r => r.data)

// Violations
export const getViolations = (params: Record<string, unknown> = {}): Promise<PaginatedResponse<Violation>> =>
  apiClient.get('/violations', { params }).then(r => r.data)

export const getViolation = (id: number): Promise<Violation> =>
  apiClient.get(`/violations/${id}`).then(r => r.data)

export const getViolationStats = (hoursBack = 24) =>
  apiClient.get(`/violations/stats?hours_back=${hoursBack}`).then(r => r.data)

export const updateViolation = (id: number, data: Record<string, unknown>) =>
  apiClient.patch(`/violations/${id}`, data).then(r => r.data)

export const createEnforcementAction = (violationId: number, data: Record<string, unknown>) =>
  apiClient.post(`/violations/${violationId}/actions`, data).then(r => r.data)

// Cameras
export const getCameras = (): Promise<Camera[]> =>
  apiClient.get('/cameras').then(r => r.data)

export const getCamera = (id: number): Promise<Camera> =>
  apiClient.get(`/cameras/${id}`).then(r => r.data)

export const createCamera = (data: Record<string, unknown>) =>
  apiClient.post('/cameras', data).then(r => r.data)

export const updateCamera = (id: number, data: Record<string, unknown>) =>
  apiClient.patch(`/cameras/${id}`, data).then(r => r.data)

export const ingestFrame = (cameraId: number, file: File, frameNumber = 0) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient.post(`/cameras/${cameraId}/ingest?frame_number=${frameNumber}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)
}

// Zones
export const getZones = (params: Record<string, unknown> = {}): Promise<Zone[]> =>
  apiClient.get('/zones', { params }).then(r => r.data)

export const createZone = (data: Record<string, unknown>) =>
  apiClient.post('/zones', data).then(r => r.data)

export const updateZone = (id: number, data: Record<string, unknown>) =>
  apiClient.patch(`/zones/${id}`, data).then(r => r.data)

// Congestion
export const getCongestionTimeline = (hoursBack = 24, intervalMinutes = 30) =>
  apiClient.get(`/congestion/timeline?hours_back=${hoursBack}&interval_minutes=${intervalMinutes}`).then(r => r.data)

export const getCurrentCongestion = () =>
  apiClient.get('/congestion/current').then(r => r.data)

// Hotspots & Heatmap
export const getHeatmap = (hoursBack = 24): Promise<{ points: HeatmapPoint[]; count: number }> =>
  apiClient.get(`/hotspots/heatmap?hours_back=${hoursBack}`).then(r => r.data)

export const getHotspots = (hoursBack = 24) =>
  apiClient.get(`/hotspots?hours_back=${hoursBack}`).then(r => r.data)

// Predictions
export const getForecast = (hoursAhead = 24): Promise<{ predictions: Prediction[] }> =>
  apiClient.get(`/predictions/forecast?hours_ahead=${hoursAhead}`).then(r => r.data)

export const getRecommendations = () =>
  apiClient.get('/predictions/recommendations').then(r => r.data)

// Reports
export const getReports = (params: Record<string, unknown> = {}): Promise<Report[]> =>
  apiClient.get('/reports', { params }).then(r => r.data)

export const getReport = (id: number): Promise<Report> =>
  apiClient.get(`/reports/${id}`).then(r => r.data)

export const createReport = (data: Record<string, unknown>) =>
  apiClient.post('/reports', data).then(r => r.data)

// Search
export const search = (q: string, entity?: string) =>
  apiClient.get('/search', { params: { q, entity } }).then(r => r.data)

// Plates
export const getPlates = (params: Record<string, unknown> = {}) =>
  apiClient.get('/plates', { params }).then(r => r.data)

export const verifyPlate = (id: number, correctedText?: string) =>
  apiClient.patch(`/plates/${id}/verify`, null, { params: { corrected_text: correctedText } }).then(r => r.data)
