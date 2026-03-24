import 'server-only'

import fs from 'fs'
import path from 'path'

const ENV_FILES = ['.env.local', '.env']

function readEnvFileValue(key: string) {
  for (const filename of ENV_FILES) {
    const filePath = path.join(process.cwd(), filename)
    if (!fs.existsSync(filePath)) {
      continue
    }

    const content = fs.readFileSync(filePath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) {
        continue
      }

      const entryKey = trimmed.slice(0, separatorIndex).trim()
      if (entryKey !== key) {
        continue
      }

      const rawValue = trimmed.slice(separatorIndex + 1).trim()
      return rawValue.replace(/^['"]|['"]$/g, '')
    }
  }

  return undefined
}

export function getServerEnv(key: string) {
  return readEnvFileValue(key) || process.env[key]
}

export function requireServerEnv(key: string) {
  const value = getServerEnv(key)
  if (!value) {
    throw new Error(`${key} is not configured.`)
  }
  return value
}
