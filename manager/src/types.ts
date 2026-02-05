export interface Device {
  id: string
  name: string
  macAddress: string
  ipAddress: string
  category: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type DeviceCategory = 'Networking' | 'Server' | 'VM' | 'LXC' | 'Client' | 'IoT'
