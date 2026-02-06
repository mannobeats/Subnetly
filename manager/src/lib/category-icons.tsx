import React from 'react'
import {
  Server, Cpu, Database, Network, Laptop, Wifi,
  Monitor, HardDrive, Router, Shield, Cloud, Radio,
  Smartphone, Printer, Camera, Tv, Gamepad2, Plug,
  Box, Globe, Zap, Activity, Layers, Terminal,
  Lock, Key, Eye, Bell, Settings, Home,
  Folder, File, FileText, Mail, MessageSquare, Phone,
  Clock, Calendar, Star, Heart, Bookmark, Flag,
  AlertTriangle, AlertCircle, Info, CheckCircle, XCircle,
  ArrowUpDown, RefreshCw, Download, Upload, Share2,
  Link, Unlink, Search, Filter, SlidersHorizontal,
  BarChart3, PieChart, TrendingUp, Hash, AtSign,
  Users, User, UserCheck, ShieldCheck, ShieldAlert,
  Fingerprint, Scan, QrCode, Bluetooth, Usb,
  Battery, BatteryCharging, Power, PowerOff, ToggleLeft,
  Thermometer, Gauge, Signal, Antenna, Satellite,
  Container, Package, Truck, Building2, Factory,
  Wrench, Hammer, Cog, CircuitBoard, Microchip,
  Cable, ServerCrash, HardDriveDownload, HardDriveUpload,
  MonitorSmartphone, TabletSmartphone, Watch, Headphones, Speaker,
  Lightbulb, Fan, Heater, AirVent, Droplets,
  TreePine, Leaf, Bug, Bot, Webhook,
  Code, CodeXml, Braces, Binary, GitBranch,
  type LucideIcon
} from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  // Servers & Computing
  server: Server,
  cpu: Cpu,
  database: Database,
  'hard-drive': HardDrive,
  'circuit-board': CircuitBoard,
  microchip: Microchip,
  terminal: Terminal,
  'server-crash': ServerCrash,
  container: Container,
  // Networking
  network: Network,
  router: Router,
  wifi: Wifi,
  globe: Globe,
  radio: Radio,
  signal: Signal,
  antenna: Antenna,
  satellite: Satellite,
  cable: Cable,
  bluetooth: Bluetooth,
  // Devices
  laptop: Laptop,
  monitor: Monitor,
  smartphone: Smartphone,
  'monitor-smartphone': MonitorSmartphone,
  'tablet-smartphone': TabletSmartphone,
  watch: Watch,
  tv: Tv,
  printer: Printer,
  camera: Camera,
  headphones: Headphones,
  speaker: Speaker,
  gamepad: Gamepad2,
  // Security
  shield: Shield,
  'shield-check': ShieldCheck,
  'shield-alert': ShieldAlert,
  lock: Lock,
  key: Key,
  fingerprint: Fingerprint,
  scan: Scan,
  eye: Eye,
  // Power & Hardware
  plug: Plug,
  power: Power,
  'power-off': PowerOff,
  battery: Battery,
  'battery-charging': BatteryCharging,
  zap: Zap,
  usb: Usb,
  // Monitoring
  activity: Activity,
  gauge: Gauge,
  thermometer: Thermometer,
  'bar-chart': BarChart3,
  'pie-chart': PieChart,
  'trending-up': TrendingUp,
  // Smart Home / IoT
  lightbulb: Lightbulb,
  fan: Fan,
  heater: Heater,
  'air-vent': AirVent,
  droplets: Droplets,
  home: Home,
  'toggle-left': ToggleLeft,
  // Storage & Files
  'hard-drive-download': HardDriveDownload,
  'hard-drive-upload': HardDriveUpload,
  cloud: Cloud,
  box: Box,
  package: Package,
  layers: Layers,
  folder: Folder,
  file: File,
  'file-text': FileText,
  // Communication
  mail: Mail,
  'message-square': MessageSquare,
  phone: Phone,
  bell: Bell,
  // Development
  code: Code,
  'code-xml': CodeXml,
  braces: Braces,
  binary: Binary,
  'git-branch': GitBranch,
  webhook: Webhook,
  bot: Bot,
  'qr-code': QrCode,
  // Organization
  users: Users,
  user: User,
  'user-check': UserCheck,
  building: Building2,
  factory: Factory,
  truck: Truck,
  // Tools
  settings: Settings,
  wrench: Wrench,
  hammer: Hammer,
  cog: Cog,
  'sliders-horizontal': SlidersHorizontal,
  filter: Filter,
  // Status & Info
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  info: Info,
  // Misc
  star: Star,
  heart: Heart,
  bookmark: Bookmark,
  flag: Flag,
  hash: Hash,
  'at-sign': AtSign,
  link: Link,
  unlink: Unlink,
  search: Search,
  clock: Clock,
  calendar: Calendar,
  'refresh-cw': RefreshCw,
  'arrow-up-down': ArrowUpDown,
  download: Download,
  upload: Upload,
  share: Share2,
  'tree-pine': TreePine,
  leaf: Leaf,
  bug: Bug,
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

export function renderCategoryIcon(iconName: string, size: number, color: string): React.JSX.Element {
  const Ic = ICON_MAP[iconName] || Server
  return <Ic size={size} color={color} />
}
