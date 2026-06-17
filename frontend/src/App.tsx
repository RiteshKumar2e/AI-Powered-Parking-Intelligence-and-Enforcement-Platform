import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import LiveMonitor from './pages/LiveMonitor'
import Violations from './pages/Violations'
import ViolationDetail from './pages/ViolationDetail'
import Heatmap from './pages/Heatmap'
import Predictions from './pages/Predictions'
import Reports from './pages/Reports'
import Cameras from './pages/Cameras'
import Zones from './pages/Zones'
import Search from './pages/Search'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="monitor" element={<LiveMonitor />} />
          <Route path="violations" element={<Violations />} />
          <Route path="violations/:id" element={<ViolationDetail />} />
          <Route path="heatmap" element={<Heatmap />} />
          <Route path="predictions" element={<Predictions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="cameras" element={<Cameras />} />
          <Route path="zones" element={<Zones />} />
          <Route path="search" element={<Search />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
