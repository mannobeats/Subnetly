export interface Site {
  id: string
  name: string
  slug: string
  description?: string
  address?: string
  userId: string
  createdAt: string
  updatedAt: string
  racks?: Rack[]
  devices?: Device[]
  subnets?: Subnet[]
  vlans?: VLAN[]
  categories?: CustomCategory[]
  _count?: { devices: number; subnets: number; vlans: number }
}

export interface CustomCategory {
  id: string
  type: string
  name: string
  slug: string
  icon: string
  color: string
  siteId: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Rack {
  id: string
  name: string
  siteId: string
  site?: Site
  units: number
  description?: string
  createdAt: string
  updatedAt: string
  devices?: Device[]
}

export interface Manufacturer {
  id: string
  name: string
  slug: string
  description?: string
  createdAt: string
  updatedAt: string
  deviceTypes?: DeviceType[]
}

export interface DeviceType {
  id: string
  manufacturerId: string
  manufacturer?: Manufacturer
  model: string
  slug: string
  partNumber?: string
  uHeight: number
  isFullDepth: boolean
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Device {
  id: string
  name: string
  macAddress: string
  ipAddress: string
  category: string
  status: string
  serial?: string
  assetTag?: string
  notes?: string
  siteId?: string
  site?: Site
  rackId?: string
  rack?: Rack
  rackPosition?: number
  deviceTypeId?: string
  deviceType?: DeviceType
  platform?: string
  createdAt: string
  updatedAt: string
  interfaces?: NetworkInterface[]
  services?: Service[]
}

export interface NetworkInterface {
  id: string
  name: string
  deviceId: string
  device?: Device
  type: string
  speed?: number
  macAddress?: string
  enabled: boolean
  mtu: number
  description?: string
  mode?: string
  ipAddressId?: string
  createdAt: string
  updatedAt: string
  cableA?: Cable[]
  cableB?: Cable[]
}

export interface Cable {
  id: string
  interfaceAId: string
  interfaceA?: NetworkInterface
  interfaceBId: string
  interfaceB?: NetworkInterface
  type: string
  color?: string
  length?: number
  lengthUnit: string
  label?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface Subnet {
  id: string
  prefix: string
  mask: number
  description?: string
  siteId?: string
  site?: Site
  vlanId?: string
  vlan?: VLAN
  gateway?: string
  status: string
  role?: string
  isPool: boolean
  createdAt: string
  updatedAt: string
  ipAddresses?: IPAddress[]
  ipRanges?: IPRange[]
}

export interface IPAddress {
  id: string
  address: string
  mask: number
  subnetId?: string
  subnet?: Subnet
  status: string
  dnsName?: string
  description?: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

export interface IPRange {
  id: string
  startAddr: string
  endAddr: string
  subnetId: string
  subnet?: Subnet
  role: string
  description?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface VLAN {
  id: string
  vid: number
  name: string
  siteId?: string
  site?: Site
  status: string
  role?: string
  description?: string
  createdAt: string
  updatedAt: string
  subnets?: Subnet[]
}

export interface Service {
  id: string
  name: string
  deviceId: string
  device?: Device
  protocol: string
  ports: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface ChangeLogEntry {
  id: string
  objectType: string
  objectId: string
  action: string
  changes?: string
  timestamp: string
}

export type DeviceCategory = 'Networking' | 'Server' | 'VM' | 'LXC' | 'Client' | 'IoT'

export type DeviceStatus = 'active' | 'planned' | 'staged' | 'failed' | 'offline' | 'decommissioned'
