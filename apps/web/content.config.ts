import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    post: defineCollection({
      type: 'page',
      source: 'post/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        image: z.string().optional(),
        date: z.coerce.date(),
        // Nuxt stores date fields without their time; normalized ISO text preserves update order.
        updated_at: z.string(),
        category: z.string().optional(),
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
        audio: z.enum(['es-CL', 'es-MX', 'en-US']).optional(),
        comments: z
          .object({ show: z.boolean().default(false), enable: z.boolean().default(false) })
          .default({ show: false, enable: false }),
      }),
    }),
    portfolio: defineCollection({
      type: 'page',
      source: 'portfolio/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        date: z.coerce.date().optional(),
        status: z.string().optional(),
        featured: z.boolean().default(false),
        tags: z.array(z.string()).default([]),
        stack: z.array(z.string()).default([]),
        order: z.number().optional(),
      }),
    }),
  },
})
