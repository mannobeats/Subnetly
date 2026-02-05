import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Cleaning database...')
  await prisma.changeLog.deleteMany({})
  await prisma.service.deleteMany({})
  await prisma.cable.deleteMany({})
  await prisma.interface.deleteMany({})
  await prisma.iPAddress.deleteMany({})
  await prisma.iPRange.deleteMany({})
  await prisma.subnet.deleteMany({})
  await prisma.vLAN.deleteMany({})
  await prisma.device.deleteMany({})
  await prisma.deviceType.deleteMany({})
  await prisma.manufacturer.deleteMany({})
  await prisma.rack.deleteMany({})
  await prisma.site.deleteMany({})

  // ─── Sites ─────────────────────────────────────────────────
  console.log('Seeding sites...')
  const site = await prisma.site.create({
    data: { name: 'Portland Homelab', slug: 'portland', description: 'Primary homelab location', address: 'Portland, OR' }
  })

  // ─── Racks ─────────────────────────────────────────────────
  console.log('Seeding racks...')
  const rack = await prisma.rack.create({
    data: { name: 'Rack-01', siteId: site.id, units: 12, description: 'Main server rack' }
  })

  // ─── Manufacturers ────────────────────────────────────────
  console.log('Seeding manufacturers...')
  const mfgProxmox = await prisma.manufacturer.create({ data: { name: 'Custom Build', slug: 'custom-build', description: 'Custom-built hardware' } })
  const mfgGlinet = await prisma.manufacturer.create({ data: { name: 'GL.iNet', slug: 'gl-inet', description: 'Travel routers and networking' } })
  const mfgApple = await prisma.manufacturer.create({ data: { name: 'Apple', slug: 'apple', description: 'Apple Inc.' } })
  const mfgTP = await prisma.manufacturer.create({ data: { name: 'TP-Link', slug: 'tp-link', description: 'Networking equipment' } })

  // ─── Device Types ─────────────────────────────────────────
  console.log('Seeding device types...')
  const dtTower = await prisma.deviceType.create({ data: { manufacturerId: mfgProxmox.id, model: 'Tower Server', slug: 'tower-server', uHeight: 4, description: 'Custom tower server' } })
  const dtFlint = await prisma.deviceType.create({ data: { manufacturerId: mfgGlinet.id, model: 'Flint 2 (GL-MT6000)', slug: 'flint-2', uHeight: 1, description: 'Wi-Fi 6 Router' } })
  const dtSwitch = await prisma.deviceType.create({ data: { manufacturerId: mfgTP.id, model: 'TL-SG108E', slug: 'tl-sg108e', uHeight: 1, description: '8-Port Managed Switch' } })

  // ─── VLANs ────────────────────────────────────────────────
  console.log('Seeding VLANs...')
  const vlanMgmt = await prisma.vLAN.create({ data: { vid: 10, name: 'Management', siteId: site.id, status: 'active', role: 'management', description: 'Management network for infrastructure' } })
  const vlanServers = await prisma.vLAN.create({ data: { vid: 20, name: 'Servers', siteId: site.id, status: 'active', role: 'production', description: 'Server and VM traffic' } })
  const vlanIoT = await prisma.vLAN.create({ data: { vid: 30, name: 'IoT', siteId: site.id, status: 'active', role: 'iot', description: 'IoT devices - isolated' } })
  const vlanGuest = await prisma.vLAN.create({ data: { vid: 40, name: 'Guest', siteId: site.id, status: 'active', role: 'guest', description: 'Guest Wi-Fi network' } })

  // ─── Subnets ──────────────────────────────────────────────
  console.log('Seeding subnets...')
  const subnetMain = await prisma.subnet.create({
    data: { prefix: '10.0.10.0', mask: 24, description: 'Primary homelab subnet', siteId: site.id, vlanId: vlanMgmt.id, gateway: '10.0.10.1', status: 'active', role: 'production' }
  })
  const subnetServers = await prisma.subnet.create({
    data: { prefix: '10.0.20.0', mask: 24, description: 'Server VLAN subnet', siteId: site.id, vlanId: vlanServers.id, gateway: '10.0.20.1', status: 'active', role: 'production' }
  })
  const subnetIoT = await prisma.subnet.create({
    data: { prefix: '10.0.30.0', mask: 24, description: 'IoT isolated subnet', siteId: site.id, vlanId: vlanIoT.id, gateway: '10.0.30.1', status: 'active', role: 'iot' }
  })
  const subnetGuest = await prisma.subnet.create({
    data: { prefix: '10.0.40.0', mask: 24, description: 'Guest network', siteId: site.id, vlanId: vlanGuest.id, gateway: '10.0.40.1', status: 'active', role: 'guest' }
  })

  // ─── IP Ranges (DHCP pools, reserved, etc.) ───────────────
  console.log('Seeding IP ranges...')
  await prisma.iPRange.create({ data: { startAddr: '10.0.10.150', endAddr: '10.0.10.199', subnetId: subnetMain.id, role: 'dhcp', description: 'DHCP pool for clients' } })
  await prisma.iPRange.create({ data: { startAddr: '10.0.10.200', endAddr: '10.0.10.254', subnetId: subnetMain.id, role: 'reserved', description: 'Reserved for testing & staging' } })
  await prisma.iPRange.create({ data: { startAddr: '10.0.10.2', endAddr: '10.0.10.9', subnetId: subnetMain.id, role: 'infrastructure', description: 'Network infrastructure (switches, APs)' } })
  await prisma.iPRange.create({ data: { startAddr: '10.0.20.100', endAddr: '10.0.20.200', subnetId: subnetServers.id, role: 'dhcp', description: 'Server DHCP pool' } })
  await prisma.iPRange.create({ data: { startAddr: '10.0.30.100', endAddr: '10.0.30.200', subnetId: subnetIoT.id, role: 'dhcp', description: 'IoT DHCP pool' } })

  // ─── Devices ──────────────────────────────────────────────
  console.log('Seeding devices...')
  const devRouter = await prisma.device.create({
    data: { name: 'Flint 2 Router', macAddress: 'E4:95:6E:40:27:A1', ipAddress: '10.0.10.1', category: 'Networking', status: 'active', siteId: site.id, rackId: rack.id, rackPosition: 1, deviceTypeId: dtFlint.id, platform: 'OpenWrt' }
  })
  const devSwitch = await prisma.device.create({
    data: { name: 'Core Switch', macAddress: 'E4:95:6E:50:11:B2', ipAddress: '10.0.10.2', category: 'Networking', status: 'active', siteId: site.id, rackId: rack.id, rackPosition: 2, deviceTypeId: dtSwitch.id, platform: 'TP-Link OS' }
  })
  const devPve = await prisma.device.create({
    data: { name: 'Ayibolab - Tower', macAddress: '84:47:09:6A:40:EF', ipAddress: '10.0.10.10', category: 'Server', status: 'active', siteId: site.id, rackId: rack.id, rackPosition: 4, deviceTypeId: dtTower.id, platform: 'Proxmox VE 8.x', serial: 'PVE-001', notes: 'Main Proxmox hypervisor' }
  })
  const devAdguard = await prisma.device.create({
    data: { name: 'adguard', macAddress: 'BC:24:11:89:70:2C', ipAddress: '10.0.10.20', category: 'LXC', status: 'active', siteId: site.id, platform: 'Debian 12', notes: 'DNS sinkhole / ad blocker' }
  })
  const devNginx = await prisma.device.create({
    data: { name: 'nginx-proxy-manager', macAddress: 'BC:24:11:F6:19:FA', ipAddress: '10.0.10.21', category: 'LXC', status: 'active', siteId: site.id, platform: 'Debian 12', notes: 'Reverse proxy' }
  })
  const devCloudflared = await prisma.device.create({
    data: { name: 'cloudflared', macAddress: 'BC:24:11:6E:2A:3F', ipAddress: '10.0.10.22', category: 'LXC', status: 'active', siteId: site.id, platform: 'Debian 12', notes: 'Cloudflare tunnel' }
  })
  const devWazuh = await prisma.device.create({
    data: { name: 'wazuh', macAddress: 'BC:24:11:9C:D7:46', ipAddress: '10.0.10.30', category: 'VM', status: 'active', siteId: site.id, platform: 'Ubuntu 22.04', notes: 'SIEM / Security monitoring' }
  })
  const devLab = await prisma.device.create({
    data: { name: 'lab-services-01', macAddress: 'BC:24:11:4F:AF:65', ipAddress: '10.0.10.50', category: 'VM', status: 'active', siteId: site.id, platform: 'Ubuntu 22.04', notes: 'Docker host for lab services' }
  })
  const devMedia = await prisma.device.create({
    data: { name: 'media-server', macAddress: 'BC:24:11:19:EA:E1', ipAddress: '10.0.10.60', category: 'VM', status: 'active', siteId: site.id, platform: 'Ubuntu 22.04', notes: 'Plex / Jellyfin media server' }
  })
  const devTermix = await prisma.device.create({
    data: { name: 'termix', macAddress: 'BC:24:11:77:CE:CE', ipAddress: '10.0.10.70', category: 'VM', status: 'active', siteId: site.id, platform: 'Ubuntu 22.04' }
  })
  const devUbuntu = await prisma.device.create({
    data: { name: 'ubuntu-vm-01', macAddress: 'BC:24:11:22:33:44', ipAddress: '10.0.10.101', category: 'VM', status: 'active', siteId: site.id, platform: 'Ubuntu 24.04' }
  })
  const devDocker = await prisma.device.create({
    data: { name: 'docker-lxc', macAddress: 'BC:24:11:55:66:77', ipAddress: '10.0.10.102', category: 'LXC', status: 'active', siteId: site.id, platform: 'Debian 12' }
  })
  const devAP = await prisma.device.create({
    data: { name: 'Access Point 1', macAddress: 'E4:95:6E:60:33:C3', ipAddress: '10.0.10.5', category: 'Networking', status: 'active', siteId: site.id }
  })

  // ─── IP Addresses (registered in IPAM) ────────────────────
  console.log('Seeding IP addresses...')
  const allDevices = [devRouter, devSwitch, devPve, devAdguard, devNginx, devCloudflared, devWazuh, devLab, devMedia, devTermix, devUbuntu, devDocker, devAP]
  for (const d of allDevices) {
    await prisma.iPAddress.create({
      data: { address: d.ipAddress, mask: 24, subnetId: subnetMain.id, status: 'active', dnsName: d.name, description: `Assigned to ${d.name}`, assignedTo: d.id }
    })
  }

  // ─── Interfaces ───────────────────────────────────────────
  console.log('Seeding interfaces...')
  const ifRouterWan = await prisma.interface.create({ data: { name: 'eth0 (WAN)', deviceId: devRouter.id, type: '1000base-t', speed: 1000, macAddress: devRouter.macAddress, description: 'WAN uplink' } })
  const ifRouterLan = await prisma.interface.create({ data: { name: 'eth1 (LAN)', deviceId: devRouter.id, type: '1000base-t', speed: 1000, description: 'LAN trunk to switch' } })
  const ifSwitchUp = await prisma.interface.create({ data: { name: 'Port 1 (Uplink)', deviceId: devSwitch.id, type: '1000base-t', speed: 1000, description: 'Uplink from router' } })
  const ifSwitchPve = await prisma.interface.create({ data: { name: 'Port 2', deviceId: devSwitch.id, type: '1000base-t', speed: 1000, description: 'To Proxmox' } })
  const ifSwitchAP = await prisma.interface.create({ data: { name: 'Port 3', deviceId: devSwitch.id, type: '1000base-t', speed: 1000, description: 'To AP' } })
  const ifPve = await prisma.interface.create({ data: { name: 'enp3s0', deviceId: devPve.id, type: '2.5gbase-t', speed: 2500, macAddress: devPve.macAddress, description: 'Primary NIC' } })
  const ifAP = await prisma.interface.create({ data: { name: 'eth0', deviceId: devAP.id, type: '1000base-t', speed: 1000, description: 'PoE uplink' } })

  // ─── Cables ───────────────────────────────────────────────
  console.log('Seeding cables...')
  await prisma.cable.create({ data: { interfaceAId: ifRouterLan.id, interfaceBId: ifSwitchUp.id, type: 'cat6', color: '#0055ff', length: 0.5, label: 'Router → Switch' } })
  await prisma.cable.create({ data: { interfaceAId: ifSwitchPve.id, interfaceBId: ifPve.id, type: 'cat6', color: '#10b981', length: 1.0, label: 'Switch → Proxmox' } })
  await prisma.cable.create({ data: { interfaceAId: ifSwitchAP.id, interfaceBId: ifAP.id, type: 'cat6', color: '#f97316', length: 5.0, label: 'Switch → AP' } })

  // ─── Services ─────────────────────────────────────────────
  console.log('Seeding services...')
  await prisma.service.create({ data: { name: 'DNS', deviceId: devAdguard.id, protocol: 'udp', ports: '53', description: 'AdGuard Home DNS' } })
  await prisma.service.create({ data: { name: 'AdGuard Web UI', deviceId: devAdguard.id, protocol: 'tcp', ports: '3000', description: 'AdGuard admin panel' } })
  await prisma.service.create({ data: { name: 'HTTP Proxy', deviceId: devNginx.id, protocol: 'tcp', ports: '80,443', description: 'Nginx Proxy Manager' } })
  await prisma.service.create({ data: { name: 'NPM Admin', deviceId: devNginx.id, protocol: 'tcp', ports: '81', description: 'NPM admin panel' } })
  await prisma.service.create({ data: { name: 'Cloudflare Tunnel', deviceId: devCloudflared.id, protocol: 'tcp', ports: '443', description: 'Argo tunnel' } })
  await prisma.service.create({ data: { name: 'Wazuh Dashboard', deviceId: devWazuh.id, protocol: 'tcp', ports: '443', description: 'Wazuh SIEM dashboard' } })
  await prisma.service.create({ data: { name: 'Wazuh Agent', deviceId: devWazuh.id, protocol: 'tcp', ports: '1514,1515', description: 'Agent registration & comms' } })
  await prisma.service.create({ data: { name: 'Plex', deviceId: devMedia.id, protocol: 'tcp', ports: '32400', description: 'Plex Media Server' } })
  await prisma.service.create({ data: { name: 'Proxmox Web UI', deviceId: devPve.id, protocol: 'tcp', ports: '8006', description: 'Proxmox management interface' } })
  await prisma.service.create({ data: { name: 'SSH', deviceId: devPve.id, protocol: 'tcp', ports: '22', description: 'Secure Shell' } })

  // ─── Change Log ───────────────────────────────────────────
  console.log('Seeding changelog...')
  await prisma.changeLog.create({ data: { objectType: 'Device', objectId: devPve.id, action: 'create', changes: JSON.stringify({ name: 'Ayibolab - Tower', ipAddress: '10.0.10.10' }) } })
  await prisma.changeLog.create({ data: { objectType: 'Subnet', objectId: subnetMain.id, action: 'create', changes: JSON.stringify({ prefix: '10.0.10.0/24' }) } })
  await prisma.changeLog.create({ data: { objectType: 'VLAN', objectId: vlanMgmt.id, action: 'create', changes: JSON.stringify({ vid: 10, name: 'Management' }) } })

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
