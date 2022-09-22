import { z } from 'zod'

export const schema = z.object({
  uri: z.string(),
  httpMethod: z.enum([
    'GET',
    'POST',
    'HEAD',
    'PUT',
    'DELETE',
    'PATCH',
    'OPTIONS',
  ]),
  body: z.optional(z.string()),
  headers: z.optional(z.record(z.string(), z.string())),
  oidcToken: z.optional(
    z.object({
      audience: z.optional(z.string()),
    }),
  ),
})

export type Schema = z.infer<typeof schema>
