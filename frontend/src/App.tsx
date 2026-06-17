import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import type { UserRole } from './types'
import Layout from './components/Layout'
import Landing from './pages/Landing'
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

function RoleGuard({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role as UserRole)) {
    return <Navigate to="/app/dashboard" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />

          {/* All roles */}
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="violations" element={<Violations />} />
          <Route path="violations/:id" element={<ViolationDetail />} />
          <Route path="heatmap"    element={<Heatmap />} />
          <Route path="search"     element={<Search />} />

          {/* Admin + Officer */}
          <Route path="monitor" element={
            <RoleGuard roles={['admin', 'officer']}>
              <LiveMonitor />
            </RoleGuard>
          } />
          <Route path="cameras" element={
            <RoleGuard roles={['admin', 'officer']}>
              <Cameras />
            </RoleGuard>
          } />

          {/* Admin + Analyst */}
          <Route path="predictions" element={
            <RoleGuard roles={['admin', 'analyst']}>
              <Predictions />
            </RoleGuard>
          } />
          <Route path="reports" element={
            <RoleGuard roles={['admin', 'analyst']}>
              <Reports />
            </RoleGuard>
          } />

          {/* Admin + Analyst + Viewer */}
          <Route path="zones" element={
            <RoleGuard roles={['admin', 'analyst', 'viewer']}>
              <Zones />
            </RoleGuard>
          } />
        </Route>

        {/* Legacy redirects */}
        <Route path="/dashboard"   element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/monitor"     element={<Navigate to="/app/monitor" replace />} />
        <Route path="/violations"  element={<Navigate to="/app/violations" replace />} />
        <Route path="/heatmap"     element={<Navigate to="/app/heatmap" replace />} />
        <Route path="/predictions" element={<Navigate to="/app/predictions" replace />} />
        <Route path="/reports"     element={<Navigate to="/app/reports" replace />} />
        <Route path="/cameras"     element={<Navigate to="/app/cameras" replace />} />
        <Route path="/zones"       element={<Navigate to="/app/zones" replace />} />
        <Route path="/search"      element={<Navigate to="/app/search" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
