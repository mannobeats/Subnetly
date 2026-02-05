# Homelab Network IP Plan & Migration Guide

This document outlines the IP address organization for the homelab, focusing on the `10.0.10.0/24` subnet.

## Network Configuration
- **Subnet:** `10.0.10.0/24`
- **Subnet Mask:** `255.255.255.0`
- **Gateway (Router):** `10.0.10.1`
- **DNS Servers:** `10.0.10.1` (Router) or `10.0.10.20` (Pi-hole/AdGuard)

---

## IP Allocation Table

| Range / IP | Category | Description |
| :--- | :--- | :--- |
| **.1** | **Gateway** | Primary Router (UDM, OPNsense, pfSense) |
| **.2 - .9** | **Networking** | Managed Switches, Access Points, Power Dist. |
| **.10 - .19** | **Hypervisors** | Proxmox Nodes, ESXi Hosts |
| **.20 - .49** | **Core Infrastructure** | DNS, TrueNAS, Reverse Proxies (Nginx, Traefik) |
| **.50 - .99** | **Virtual Machines** | Static IPs for high-priority VMs |
| **.100 - .149**| **LXC Containers** | Static IPs for lightweight containers |
| **.150 - .199**| **DHCP Pool** | Dynamic IPs for Laptops, Phones, IoT |
| **.200 - .254**| **Reserved** | Testing, Staging, and future expansion |

---

## Suggested Assignments

### 1. Networking Infrastructure
| Device | IP Address | Notes |
| :--- | :--- | :--- |
| Primary Router | `10.0.10.1` | Main Gateway |
| Core Switch | `10.0.10.2` | Primary Layer 2/3 Switch |
| Access Point 1| `10.0.10.5` | |

### 2. Proxmox & Hypervisors
| Hostname | IP Address | Notes |
| :--- | :--- | :--- |
| pve-01 | `10.0.10.10` | Main Proxmox Node |
| pve-02 | `10.0.10.11` | Secondary Node |

### 3. Virtual Machines (Example)
| VM Name | IP Address | OS / Service |
| :--- | :--- | :--- |
| docker-srv-01 | `10.0.10.50` | Main Docker Host |
| plex-media | `10.0.10.60` | Media Server |
| home-assistant| `10.0.10.70` | Smart Home Controller |

### 4. LXC Containers (Example)
| LXC Name | IP Address | Service |
| :--- | :--- | :--- |
| pihole | `10.0.10.20` | DNS Sinkhole |
| nginx-proxy | `10.0.10.21` | Reverse Proxy |
| database-01 | `10.0.10.100`| MariaDB / PostgreSQL |
### 3. How to Add a New VM/LXC (Best Practice)
When you want to spin up a new service and give it a specific IP:

1. **Create in Proxmox:** Setup your VM/LXC but **don't start it yet**.
2. **Get MAC:** Go to the VM's **Network** tab in Proxmox and copy the MAC Address.
3. **Reserve in Flint 3:**
   * Go to **Network -> Static Leases**.
   * Add a new lease using the MAC from Proxmox and your desired IP from this plan.
4. **Start & Verify:** Start the VM. It will automatically pull the reserved IP.
5. **Document:** Add the new device to the **Device MAC Address Registry** below.

---

## Device MAC Address Registry
*Total: 10 Devices Identified from Screenshot*

| Device Name | MAC Address | Current IP (Old) | New IP (10.0.10.x) |
| :--- | :--- | :--- | :--- |
| **Ayibolab - Tower** (Proxmox host) | `84:47:09:6A:40:EF` | `192.168.8.10` | **10.0.10.10** |
| **adguard** | `BC:24:11:89:70:2C` | `192.168.8.148` | **10.0.10.20** |
| **nginx-proxy-manager** | `BC:24:11:F6:19:FA` | `192.168.8.186` | **10.0.10.21** |
| **cloudflared** | `BC:24:11:6E:2A:3F` | `192.168.8.203` | **10.0.10.22** |
| **wazuh** | `BC:24:11:9C:D7:46` | `192.168.8.166` | **10.0.10.30** |
| **lab-services-01** | `BC:24:11:4F:AF:65` | `192.168.8.202` | **10.0.10.50** |
| **media-server** | `BC:24:11:19:EA:E1` | `192.168.8.143` | **10.0.10.60** |
| **termix** | `BC:24:11:77:CE:CE` | `192.168.8.176` | **10.0.10.70** |

---

---

## Best Practices & Strategy

### 1. Hard Static vs. DHCP Reservations
| Method | Where to Config | Best For | Why? |
| :--- | :--- | :--- | :--- |
| **Hard Static** | Inside the VM/LXC OS | Proxmox Host, Gateway | If the router is offline, you can still access the host. |
| **DHCP Reservation**| Inside the Router UI | Everything else (VMs, LXCs) | Centralized management. No need to login to 20 VMs to change IPs. |

### 2. Migration Strategy (When old router is already gone)
If you don't have your old router and don't know your MAC addresses, follow the **Discovery Method**:

1. **Setup Subnet:** Connect to your new Flint 3. Change its LAN IP to `10.0.10.1` before plugging in your server.
2. **First Sync:** Plug in your Proxmox server and start your VMs/LXCs. 
3. **Identify:** Look at the **"Clients"** list in the Flint 3 dashboard. It will show youทุกเครื่อง (every device) that just connected with a random IP.
4. **Map & Lease:**
   * Identify the device by its hostname or current IP.
   * Copy the MAC address into the **Device MAC Address Registry** below.
   * In the Flint 3 UI, "Bind" that MAC address to your desired IP from the plan.
5. **Enforce:** Restart the VM/LXC or the Proxmox host to force everything to pick up their new "Permanent" IPs.

---

## IP Allocation Table
