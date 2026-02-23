import { headers } from "next/headers";
import { auth } from "./auth";
import prisma from "./db";

export async function getActiveSite() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { userId: null, siteId: null };

  const userId = session.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeSiteId: true },
  });

  if (user?.activeSiteId) {
    // Verify the site still exists and belongs to user
    const site = await prisma.site.findFirst({
      where: { id: user.activeSiteId, userId },
    });
    if (site) {
      await seedDefaultCategories(site.id);
      return { userId, siteId: site.id };
    }
  }

  // Fallback: find user's first site or create a default one
  let site = await prisma.site.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (!site) {
    site = await prisma.site.create({
      data: {
        name: "Default Site",
        slug: `site-${userId.slice(0, 8)}`,
        description: "Default site",
        userId,
      },
    });
    // Seed default categories for the new site
    await seedDefaultCategories(site.id);
  }

  // Update user's active site
  await prisma.user.update({
    where: { id: userId },
    data: { activeSiteId: site.id },
  });
  return { userId, siteId: site.id };
}

export async function seedDefaultCategories(siteId: string) {
  const deviceCategories = [
    {
      type: "device",
      name: "Server",
      slug: "server",
      icon: "server",
      color: "#10b981",
      sortOrder: 0,
    },
    {
      type: "device",
      name: "VM",
      slug: "vm",
      icon: "cpu",
      color: "#7c3aed",
      sortOrder: 1,
    },
    {
      type: "device",
      name: "LXC",
      slug: "lxc",
      icon: "database",
      color: "#f97316",
      sortOrder: 2,
    },
    {
      type: "device",
      name: "Networking",
      slug: "networking",
      icon: "network",
      color: "#3366ff",
      sortOrder: 3,
    },
    {
      type: "device",
      name: "Client",
      slug: "client",
      icon: "laptop",
      color: "#5e6670",
      sortOrder: 4,
    },
    {
      type: "device",
      name: "IoT",
      slug: "iot",
      icon: "wifi",
      color: "#06b6d4",
      sortOrder: 5,
    },
  ];
  const vlanRoles = [
    {
      type: "vlan_role",
      name: "Management",
      slug: "management",
      icon: "shield",
      color: "#3366ff",
      sortOrder: 0,
    },
    {
      type: "vlan_role",
      name: "Production",
      slug: "production",
      icon: "server",
      color: "#10b981",
      sortOrder: 1,
    },
    {
      type: "vlan_role",
      name: "IoT",
      slug: "iot",
      icon: "wifi",
      color: "#f97316",
      sortOrder: 2,
    },
    {
      type: "vlan_role",
      name: "Guest",
      slug: "guest",
      icon: "globe",
      color: "#8b5cf6",
      sortOrder: 3,
    },
  ];
  const deviceStatuses = [
    {
      type: "device_status",
      name: "Active",
      slug: "active",
      icon: "activity",
      color: "#10b981",
      sortOrder: 0,
    },
    {
      type: "device_status",
      name: "Planned",
      slug: "planned",
      icon: "clock",
      color: "#3366ff",
      sortOrder: 1,
    },
    {
      type: "device_status",
      name: "Staged",
      slug: "staged",
      icon: "box",
      color: "#7c3aed",
      sortOrder: 2,
    },
    {
      type: "device_status",
      name: "Offline",
      slug: "offline",
      icon: "wifi-off",
      color: "#f59e0b",
      sortOrder: 3,
    },
    {
      type: "device_status",
      name: "Decommissioned",
      slug: "decommissioned",
      icon: "trash",
      color: "#ef4444",
      sortOrder: 4,
    },
  ];
  const vlanStatuses = [
    {
      type: "vlan_status",
      name: "Active",
      slug: "active",
      icon: "activity",
      color: "#10b981",
      sortOrder: 0,
    },
    {
      type: "vlan_status",
      name: "Reserved",
      slug: "reserved",
      icon: "shield",
      color: "#f59e0b",
      sortOrder: 1,
    },
    {
      type: "vlan_status",
      name: "Deprecated",
      slug: "deprecated",
      icon: "alert-triangle",
      color: "#ef4444",
      sortOrder: 2,
    },
  ];
  const subnetRoles = [
    {
      type: "subnet_role",
      name: "Management",
      slug: "management",
      icon: "shield",
      color: "#3366ff",
      sortOrder: 0,
    },
    {
      type: "subnet_role",
      name: "Production",
      slug: "production",
      icon: "server",
      color: "#10b981",
      sortOrder: 1,
    },
    {
      type: "subnet_role",
      name: "IoT",
      slug: "iot",
      icon: "wifi",
      color: "#f97316",
      sortOrder: 2,
    },
    {
      type: "subnet_role",
      name: "Guest",
      slug: "guest",
      icon: "globe",
      color: "#8b5cf6",
      sortOrder: 3,
    },
  ];
  const ipRangeRoles = [
    {
      type: "ip_range_role",
      name: "DHCP",
      slug: "dhcp",
      icon: "database",
      color: "#f59e0b",
      sortOrder: 0,
    },
    {
      type: "ip_range_role",
      name: "Reserved",
      slug: "reserved",
      icon: "shield",
      color: "#8b5cf6",
      sortOrder: 1,
    },
    {
      type: "ip_range_role",
      name: "Infrastructure",
      slug: "infrastructure",
      icon: "network",
      color: "#06b6d4",
      sortOrder: 2,
    },
    {
      type: "ip_range_role",
      name: "General",
      slug: "general",
      icon: "tag",
      color: "#94a3b8",
      sortOrder: 3,
    },
  ];
  const ipAddressTypes = [
    {
      type: "ip_address_type",
      name: "Gateway",
      slug: "gateway",
      icon: "shield",
      color: "#10b981",
      sortOrder: 0,
    },
    {
      type: "ip_address_type",
      name: "Assigned",
      slug: "assigned",
      icon: "server",
      color: "#3366ff",
      sortOrder: 1,
    },
    {
      type: "ip_address_type",
      name: "DHCP Pool",
      slug: "dhcp",
      icon: "database",
      color: "#f59e0b",
      sortOrder: 2,
    },
    {
      type: "ip_address_type",
      name: "Reserved",
      slug: "reserved",
      icon: "tag",
      color: "#8b5cf6",
      sortOrder: 3,
    },
    {
      type: "ip_address_type",
      name: "Infrastructure",
      slug: "infrastructure",
      icon: "network",
      color: "#06b6d4",
      sortOrder: 4,
    },
    {
      type: "ip_address_type",
      name: "Available",
      slug: "available",
      icon: "circle",
      color: "#94a3b8",
      sortOrder: 5,
    },
  ];
  const serviceProtocols = [
    {
      type: "service_protocol",
      name: "TCP",
      slug: "tcp",
      icon: "globe",
      color: "#3366ff",
      sortOrder: 0,
    },
    {
      type: "service_protocol",
      name: "UDP",
      slug: "udp",
      icon: "globe",
      color: "#10b981",
      sortOrder: 1,
    },
  ];
  const serviceEnvironments = [
    {
      type: "service_environment",
      name: "Production",
      slug: "production",
      icon: "server",
      color: "#dcfce7",
      sortOrder: 0,
    },
    {
      type: "service_environment",
      name: "Staging",
      slug: "staging",
      icon: "box",
      color: "#fef3c7",
      sortOrder: 1,
    },
    {
      type: "service_environment",
      name: "Development",
      slug: "development",
      icon: "code",
      color: "#e0e7ff",
      sortOrder: 2,
    },
    {
      type: "service_environment",
      name: "Testing",
      slug: "testing",
      icon: "flask",
      color: "#f3e8ff",
      sortOrder: 3,
    },
  ];
  const serviceHealth = [
    {
      type: "service_health",
      name: "Healthy",
      slug: "healthy",
      icon: "activity",
      color: "#22c55e",
      sortOrder: 0,
    },
    {
      type: "service_health",
      name: "Degraded",
      slug: "degraded",
      icon: "alert-triangle",
      color: "#f59e0b",
      sortOrder: 1,
    },
    {
      type: "service_health",
      name: "Down",
      slug: "down",
      icon: "x-circle",
      color: "#ef4444",
      sortOrder: 2,
    },
    {
      type: "service_health",
      name: "Unknown",
      slug: "unknown",
      icon: "help-circle",
      color: "#94a3b8",
      sortOrder: 3,
    },
  ];
  const wifiSecurities = [
    {
      type: "wifi_security",
      name: "WPA2 Personal",
      slug: "wpa2-personal",
      icon: "lock",
      color: "#3b82f6",
      sortOrder: 0,
    },
    {
      type: "wifi_security",
      name: "WPA3 Personal",
      slug: "wpa3-personal",
      icon: "shield",
      color: "#8b5cf6",
      sortOrder: 1,
    },
    {
      type: "wifi_security",
      name: "WPA2 Enterprise",
      slug: "wpa2-enterprise",
      icon: "lock",
      color: "#1d4ed8",
      sortOrder: 2,
    },
    {
      type: "wifi_security",
      name: "WPA3 Enterprise",
      slug: "wpa3-enterprise",
      icon: "shield",
      color: "#6d28d9",
      sortOrder: 3,
    },
    {
      type: "wifi_security",
      name: "Open",
      slug: "open",
      icon: "wifi",
      color: "#64748b",
      sortOrder: 4,
    },
  ];
  await prisma.customCategory.createMany({
    data: [
      ...deviceCategories,
      ...vlanRoles,
      ...deviceStatuses,
      ...vlanStatuses,
      ...subnetRoles,
      ...ipRangeRoles,
      ...ipAddressTypes,
      ...serviceProtocols,
      ...serviceEnvironments,
      ...serviceHealth,
      ...wifiSecurities,
    ].map((d) => ({ ...d, siteId })),
    skipDuplicates: true,
  });
}
