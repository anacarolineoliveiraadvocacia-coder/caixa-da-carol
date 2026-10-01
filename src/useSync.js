import { useEffect, useState } from 'react'
import { subscribeSync, getSyncState } from './sync.js'

export function useSync() {
  const [s, setS] = useState(getSyncState())
  useEffect(() => subscribeSync(setS), [])
  return s
}
