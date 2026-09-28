import { z } from 'zod'

const SocialLink = z.object({
  id: z.string(),
  label: z.string(),
  url: z.url(),
})

const NavItem = z.object({
  label: z.string(),
  path: z.string(),
})

const Avatar = z.object({
  url: z.string(),
  alt: z.string(),
})

export const SiteConfigSchema = z.object({
  site: z.object({
    name: z.string(),
    title: z.string(),
    description: z.string().optional(),
    url: z.url(),
    basePath: z.string().default('/'),
    language: z.string().default('en'),
  }),
  profile: z.object({
    displayName: z.string(),
    description: z.string().optional(),
    email: z.email(),
    avatar: Avatar.optional(),
    logo: Avatar.optional(),
  }),
  social: z.array(SocialLink).default([]),
  navigation: z.array(NavItem).default([]),
  blog: z
    .object({
      postPerPage: z.number().default(10),
      showTags: z.boolean().default(true),
      showCategories: z.boolean().default(true),
    })
    .default(() => ({ postPerPage: 10, showTags: true, showCategories: true })),
  portfolio: z
    .object({
      title: z.string().default('Portfolio'),
      showTechnologies: z.boolean().default(true),
    })
    .default(() => ({ title: 'Portfolio', showTechnologies: true })),
  footer: z.object({ text: z.string().optional() }).optional(),
})

export type SiteConfig = z.infer<typeof SiteConfigSchema>
