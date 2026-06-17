import { useState, useCallback } from 'react'
import { login as loginApi } from '../api'
import type { User } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  const login = useCallback(async (username: string, password: string) => {
    const data = await loginApi(username, password)
    localStorage.setItem('token', data.access_token)
    const userObj: User = {
      id: data.user_id,
      role: data.role,
      email: '',
      username,
      full_name: username,
      is_active: true,
      created_at: new Date().toISOString(),
    }
    localStorage.setItem('user', JSON.stringify(userObj))
    setToken(data.access_token)
    setUser(userObj)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  return { user, token, login, logout, isAuthenticated: !!token }
}
