/** Strips protocol, www., path, query, fragment, and port from a raw URL or domain string. */
export function normalizeDomain(input: string): string {
  let val = input.trim().toLowerCase()
  val = val.replace(/^[a-z][a-z0-9+\-.]*:\/\//, '')
  val = val.replace(/^www\./, '')
  val = val.split(/[/?#]/)[0]
  val = val.replace(/:\d+$/, '')
  return val
}
