import { headers } from 'next/headers'
import { auth } from './auth'
import prisma from './db'

export async function getActiveSite() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { userId: null, siteId: null }

  const userId = session.user.id
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeSiteId: true } })

  if (user?.activeSiteId) {
    // Verify the site still exists and belongs to user
    const site = await prisma.site.findFirst({ where: { id: user.activeSiteId, userId } })
    if (site) return { userId, siteId: site.id }
  }

  // Fallback: find user's first site or create a default one
  let site = await prisma.site.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } })
  if (!site) {
    site = await prisma.site.create({
      data: {
        name: 'Default Site',
        slug: `site-${userId.slice(0, 8)}`,
        description: 'Default site',
        userId,
      },
    })
    // Seed default categories for the new site
    await seedDefaultCategories(site.id)
  }

  // Update user's active site
  await prisma.user.update({ where: { id: userId }, data: { activeSiteId: site.id } })
  return { userId, siteId: site.id }
}

export async function seedDefaultCategories(siteId: string) {
  const deviceCategories = [
    { type: 'device', name: 'Server', slug: 'server', icon: 'server', color: '#10b981', sortOrder: 0 },
    { type: 'device', name: 'VM', slug: 'vm', icon: 'cpu', color: '#7c3aed', sortOrder: 1 },
    { type: 'device', name: 'LXC', slug: 'lxc', icon: 'database', color: '#f97316', sortOrder: 2 },
    { type: 'device', name: 'Networking', slug: 'networking', icon: 'network', color: '#3366ff', sortOrder: 3 },
    { type: 'device', name: 'Client', slug: 'client', icon: 'laptop', color: '#5e6670', sortOrder: 4 },
    { type: 'device', name: 'IoT', slug: 'iot', icon: 'wifi', color: '#06b6d4', sortOrder: 5 },
  ]
  const vlanRoles = [
    { type: 'vlan_role', name: 'Management', slug: 'management', icon: 'shield', color: '#3366ff', sortOrder: 0 },
    { type: 'vlan_role', name: 'Production', slug: 'production', icon: 'server', color: '#10b981', sortOrder: 1 },
    { type: 'vlan_role', name: 'IoT', slug: 'iot', icon: 'wifi', color: '#f97316', sortOrder: 2 },
    { type: 'vlan_role', name: 'Guest', slug: 'guest', icon: 'globe', color: '#8b5cf6', sortOrder: 3 },
  ]
  await prisma.customCategory.createMany({
    data: [...deviceCategories, ...vlanRoles].map(d => ({ ...d, siteId })),
    skipDuplicates: true,
  })
}
