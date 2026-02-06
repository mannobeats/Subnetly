import {
  Server, Cpu, Database, Network, Laptop, Wifi,
  Monitor, HardDrive, Router, Shield, Cloud, Radio,
  Smartphone, Printer, Camera, Tv, Gamepad2, Plug,
  Box, Globe, Zap, Activity, Layers, Terminal,
  type LucideIcon
} from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  server: Server,
  cpu: Cpu,
  database: Database,
  network: Network,
  laptop: Laptop,
  wifi: Wifi,
  monitor: Monitor,
  'hard-drive': HardDrive,
  router: Router,
  shield: Shield,
  cloud: Cloud,
  radio: Radio,
  smartphone: Smartphone,
  printer: Printer,
  camera: Camera,
  tv: Tv,
  gamepad: Gamepad2,
  plug: Plug,
  box: Box,
  globe: Globe,
  zap: Zap,
  activity: Activity,
  layers: Layers,
  terminal: Terminal,
}

export const ICON_OPTIONS = Object.keys(ICON_MAP)

export const COLOR_OPTIONS = [
  '#0055ff', '#3b82f6', '#06b6d4', '#10b981', '#22c55e',
  '#84cc16', '#eab308', '#f97316', '#ef4444', '#dc2626',
  '#ec4899', '#d946ef', '#a855f7', '#7c3aed', '#6366f1',
  '#5e6670', '#94a3b8', '#1e293b',
]

export function getCategoryIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || Server
}
