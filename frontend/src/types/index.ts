export type UserRole = 'admin' | 'officer' | 'analyst' | 'viewer'

export interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface AuthState {
  user: User | null
  token: string | null
}

export type ViolationStatus = 'pending_review' | 'confirmed' | 'dismissed' | 'ticket_issued' | 'appealed'
export type ViolationType =
  | 'illegal_parking' | 'double_parking' | 'no_parking_zone'
  | 'blocking_intersection' | 'pavement_parking' | 'bus_stop_parking'
  | 'fire_hydrant_blocking' | 'wrong_side_driving' | 'red_light_violation'
  | 'stop_line_violation' | 'helmet_non_compliance' | 'seatbelt_non_compliance'
  | 'triple_riding' | 'other'

export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'bus' | 'auto_rickshaw' | 'bicycle' | 'unknown'

export interface Violation {
  id: number
  camera_id: number | null
  zone_id: number | null
  violation_type: ViolationType
  vehicle_type: VehicleType
  plate_number: string | null
  plate_confidence: number
  detection_confidence: number
  congestion_impact_score: number
  latitude: number | null
  longitude: number | null
  frame_timestamp: string
  dwell_seconds: number
  status: ViolationStatus
  fine_amount: number
  bounding_box: Record<string, number> | null
  evidence_image_url: string | null
  annotated_image_url: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
  camera_name?: string
  zone_name?: string
  enforcement_actions?: EnforcementAction[]
}

export interface EnforcementAction {
  id: number
  action_type: string
  officer: string
  notes: string
  timestamp: string
}

export type CameraStatus = 'active' | 'inactive' | 'maintenance' | 'error'

export interface Camera {
  id: number
  name: string
  location_name: string
  latitude: number
  longitude: number
  rtsp_url: string | null
  status: CameraStatus
  zone_type: string
  fps: number
  resolution: string
  notes: string | null
  installed_at: string
  last_active: string | null
  violation_count: number
}

export type ZoneType = 'no_parking' | 'restricted' | 'metro_station' | 'commercial' | 'event' | 'intersection' | 'general'

export interface Zone {
  id: number
  name: string
  zone_type: ZoneType
  description: string | null
  boundary: Record<string, unknown> | null
  center_lat: number
  center_lng: number
  radius_meters: number
  is_active: boolean
  fine_amount: number
  priority_level: number
  max_parking_minutes: number
  operating_hours: Record<string, string> | null
  created_at: string
  violation_count: number
}

export interface CongestionMetric {
  id: number
  camera_id: number | null
  latitude: number
  longitude: number
  timestamp: string
  vehicle_count: number
  parked_vehicle_count: number
  moving_vehicle_count: number
  average_speed_kmh: number
  congestion_score: number
  violation_count: number
  blocked_lanes: number
  flow_rate: number
}

export interface HeatmapPoint {
  lat: number
  lng: number
  intensity: number
  violation_count: number
  severity: number
}

export interface Prediction {
  zone_id: number
  zone_name: string
  zone_type: string
  latitude: number
  longitude: number
  forecast_timestamp: string
  predicted_violation_count: number
  predicted_congestion_score: number
  confidence_lower: number
  confidence_upper: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  recommended_patrol_count: number
  recommendation: string
}

export interface Report {
  id: number
  report_type: string
  title: string
  summary: string | null
  content: string | null
  structured_data: Record<string, unknown> | null
  period_start: string | null
  period_end: string | null
  llm_model: string | null
  input_tokens: number
  output_tokens: number
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface DashboardSummary {
  violations: {
    today: number
    yesterday: number
    change_percent: number
    this_week: number
    pending_review: number
  }
  cameras: {
    active: number
    total: number
    inactive: number
  }
  congestion: {
    current_avg_score: number
    level: string
  }
  generated_at: string
}
