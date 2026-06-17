import { Bell, LogOut, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
      <div className="text-sm text-gray-400">
        Smart Parking Intelligence &amp; Enforcement
      </div>
      <div className="flex items-center gap-3">
        <button className="text-gray-400 hover:text-white p-1">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <div className="bg-blue-600 rounded-full p-1">
            <User size={14} className="text-white" />
          </div>
          <span className="text-gray-300">{user?.username}</span>
          <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded capitalize">
            {user?.role}
          </span>
        </div>
        <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 p-1">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
