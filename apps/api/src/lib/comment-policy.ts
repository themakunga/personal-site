export async function getCommentPolicy(slug: string) {
  try {
    const response = await fetch(process.env.COMMENT_POLICY_URL ?? '', {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return null
    const policies = await response.json()
    if (!policies || typeof policies !== 'object' || Array.isArray(policies)) return null
    if (!Object.hasOwn(policies, slug)) return { show_comments: false, enable_comments: false }
    const policy = policies[slug]
    if (
      typeof policy?.show_comments !== 'boolean' ||
      typeof policy?.enable_comments !== 'boolean'
    ) {
      return null
    }
    return { show_comments: policy.show_comments, enable_comments: policy.enable_comments }
  } catch {
    return null
  }
}
