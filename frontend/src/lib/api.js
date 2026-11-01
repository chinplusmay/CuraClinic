const TOKEN_KEY = 'curaclinic.token'
const RAW_API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : ''
const API_BASE = RAW_API_URL.replace(/\/+$/, '')

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const endpoint = `${API_BASE}/api${path}`

  let response
  try {
    response = await fetch(endpoint, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(`Cannot reach the clinic server (${endpoint}). Is the API running and accessible?`, 0)
  }

  if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    setToken(null)
    window.dispatchEvent(new Event('curaclinic:unauthorized'))
    throw new ApiError('Your session expired. Please sign in again.', 401)
  }

  if (response.status === 204) return null

  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }
  if (!response.ok) {
    let fallback = 'Something went wrong.'
    if (response.status === 401) {
      fallback = 'Email or password is incorrect.'
    } else if (response.status === 403) {
      fallback = 'Access denied. You do not have permission for this clinic.'
    } else if (response.status === 404) {
      fallback = `API endpoint not found (404) at ${endpoint}. Please check backend deployment and VITE_API_URL.`
    } else if (response.status === 502 || response.status === 503 || response.status === 504) {
      fallback = `Server is temporarily unavailable (${response.status}). If deployed on a free host, the backend service may be waking up.`
    }
    throw new ApiError(payload?.message || payload?.error || fallback, response.status)
  }
  return payload
}

function query(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) value.forEach((item) => search.append(key, item))
    else search.append(key, value)
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  registerClinic: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  me: () => request('/auth/me'),
  team: () => request('/auth/team'),
  addTeamMember: (payload) => request('/auth/team', { method: 'POST', body: payload }),

  dashboard: (date) => request(`/dashboard${query({ date })}`),
  analytics: (from, to) => request(`/analytics${query({ from, to })}`),

  appointments: (params) => request(`/appointments${query(params)}`),
  appointment: (id) => request(`/appointments/${id}`),
  book: (payload) => request('/appointments', { method: 'POST', body: payload }),
  reschedule: (id, payload) => request(`/appointments/${id}/reschedule`, { method: 'PATCH', body: payload }),
  updateStatus: (id, payload) => request(`/appointments/${id}/status`, { method: 'PATCH', body: payload }),
  confirmAppointment: (id) => request(`/appointments/${id}/confirm`, { method: 'POST' }),
  cancelAppointment: (id, payload) => request(`/appointments/${id}/cancel`, { method: 'POST', body: payload }),
  sendReminder: (id, type) => request(`/appointments/${id}/reminder`, { method: 'POST', body: { type } }),

  patients: (q) => request(`/patients${query({ q })}`),
  patient: (id) => request(`/patients/${id}`),
  createPatient: (payload) => request('/patients', { method: 'POST', body: payload }),
  updatePatient: (id, payload) => request(`/patients/${id}`, { method: 'PUT', body: payload }),

  doctors: () => request('/doctors'),
  createDoctor: (payload) => request('/doctors', { method: 'POST', body: payload }),
  updateDoctor: (id, payload) => request(`/doctors/${id}`, { method: 'PUT', body: payload }),
  saveSchedules: (id, payload) => request(`/doctors/${id}/schedules`, { method: 'PUT', body: payload }),
  addBlock: (id, payload) => request(`/doctors/${id}/blocks`, { method: 'POST', body: payload }),
  removeBlock: (id, blockId) => request(`/doctors/${id}/blocks/${blockId}`, { method: 'DELETE' }),
  availability: (date) => request(`/availability${query({ date })}`),

  waitlist: () => request('/waitlist'),
  recovery: (from, to) => request(`/waitlist/recovery${query({ from, to })}`),
  addWaitlist: (payload) => request('/waitlist', { method: 'POST', body: payload }),
  cancelWaitlist: (id) => request(`/waitlist/${id}/cancel`, { method: 'PATCH' }),
  offerSlot: (id, payload) => request(`/waitlist/${id}/offer`, { method: 'POST', body: payload }),
}
