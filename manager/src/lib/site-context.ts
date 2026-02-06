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
  const defaults = [
    { name: 'Server', slug: 'server', icon: 'server', color: '#10b981', sortOrder: 0 },
    { name: 'VM', slug: 'vm', icon: 'cpu', color: '#7c3aed', sortOrder: 1 },
    { name: 'LXC', slug: 'lxc', icon: 'database', color: '#f97316', sortOrder: 2 },
    { name: 'Networking', slug: 'networking', icon: 'network', color: '#0055ff', sortOrder: 3 },
    { name: 'Client', slug: 'client', icon: 'laptop', color: '#5e6670', sortOrder: 4 },
    { name: 'IoT', slug: 'iot', icon: 'wifi', color: '#06b6d4', sortOrder: 5 },
  ]
  await prisma.customCategory.createMany({
    data: defaults.map(d => ({ ...d, siteId })),
    skipDuplicates: true,
  })
}
