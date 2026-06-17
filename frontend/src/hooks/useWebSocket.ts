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
  const mountedRef   = useRef(true)   // guards against reconnect after unmount

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
      // keepalive ping every 25s
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 25000)
      ws.addEventListener('close', () => clearInterval(ping), { once: true })
    }

    ws.onmessage = (e) => {
      if (!mountedRef.current) return
      try {
        const msg = JSON.parse(e.data) as WSMessage
        onMessage(msg)
      } catch {}
    }

    ws.onclose = () => {
      if (!mountedRef.current) return   // don't reconnect after unmount
      setConnected(false)
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      if (!mountedRef.current) return
      setConnected(false)
      // onclose will fire after onerror and handle reconnect
    }
  }, [channel, onMessage, enabled])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(reconnectRef.current)
      const ws = wsRef.current
      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close(1000, 'component unmounted')
      }
    }
  }, [connect])

  return { connected }
}
