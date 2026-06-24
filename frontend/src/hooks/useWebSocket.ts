import { useEffect, useRef, useCallback, useState } from 'react'

type WSMessage = { type: string; data: unknown }

export function useWebSocket(
  channel: string,
  onMessage: (msg: WSMessage) => void,
  enabled = true
): { connected: boolean } {
  const [connected, setConnected]  = useState(false)
  const wsRef        = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>()
  const mountedRef   = useRef(true)
  const onMessageRef = useRef(onMessage)

  // Keep the callback current without triggering reconnects
  useEffect(() => { onMessageRef.current = onMessage })

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return

    const envWs = import.meta.env.VITE_WS_URL as string | undefined
    let url: string
    if (envWs) {
      url = `${envWs}/${channel}`
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      url = `${protocol}//${window.location.host}/ws/${channel}`
    }

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return }
      setConnected(true)
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 25000)
      ws.addEventListener('close', () => clearInterval(ping), { once: true })
    }

    ws.onmessage = (e) => {
      if (!mountedRef.current) return
      try { onMessageRef.current(JSON.parse(e.data) as WSMessage) } catch {}
    }

    ws.onclose = () => {
      if (wsRef.current !== ws) return   // stale socket — cleanup already ran
      if (!mountedRef.current) return    // unmounted — no reconnect
      setConnected(false)
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => { /* onclose fires next and handles reconnect */ }
  }, [channel, enabled])   // onMessage intentionally omitted — kept via ref

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(reconnectRef.current)
      const ws = wsRef.current
      wsRef.current = null
      if (!ws) return
      if (ws.readyState === WebSocket.CONNECTING) {
        // Defer close until handshake completes — avoids "closed before established" browser error
        ws.onopen = () => ws.close(1000, 'component unmounted')
        ws.onerror = null
        ws.onmessage = null
        ws.onclose = null
      } else {
        ws.close(1000, 'component unmounted')
      }
    }
  }, [connect])

  return { connected }
}
