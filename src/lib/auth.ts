import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import prisma from './db'

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseOrigins(value: unknown): string[] {
  return normalize(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

const configuredBaseUrl = normalize(process.env.BETTER_AUTH_URL)
const trustedOrigins = Array.from(new Set([
  ...parseOrigins(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  ...(configuredBaseUrl ? [configuredBaseUrl] : []),
]))

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL: configuredBaseUrl || undefined,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: trustedOrigins.length > 0 ? trustedOrigins : undefined,
  advanced: {
    // Trust x-forwarded-* headers so reverse proxies/tunnels (Cloudflare, Nginx, Traefik)
    // can provide the correct public origin.
    trustedProxyHeaders: true,
  },
})
