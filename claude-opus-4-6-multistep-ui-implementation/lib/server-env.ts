export function getGraphQLUrl(): string {
  const url = process.env.GRAPHQL_URL
  if (!url) throw new Error('GRAPHQL_URL environment variable is not set')
  return url
}
