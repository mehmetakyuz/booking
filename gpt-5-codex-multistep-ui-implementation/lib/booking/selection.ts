type DefaultSelectable = {
  id: string
  selected?: boolean
  default?: boolean
}

export function getBackendDefault<T extends DefaultSelectable>(items: T[]) {
  return items.find((item) => item.selected || item.default) ?? items[0]
}

export function getPreferredSelection<T extends DefaultSelectable>(
  items: T[],
  preferredIds: Array<string | undefined | null>,
) {
  for (const preferredId of preferredIds) {
    if (!preferredId) {
      continue
    }

    const matching = items.find((item) => item.id === preferredId)
    if (matching) {
      return matching
    }
  }

  return getBackendDefault(items)
}
