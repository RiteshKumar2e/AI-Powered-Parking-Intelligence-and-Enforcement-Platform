import { useEffect, useRef, useCallback } from 'react'

type WSMessage = { type: string; data: unknown }

export function useWebSocket(
  channel: string,
  onMessage: (msg: WSMessage) => void,
  enabled = true
) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    if (!enabled) return
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

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WSMessage
        onMessage(msg)
      } catch {}
    }

    let pingInterval: ReturnType<typeof setInterval> | undefined

    ws.onopen = () => {
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 25000)
    }

    ws.onclose = () => {
      clearInterval(pingInterval)
      reconnectRef.current = setTimeout(connect, 3000)
    }
  }, [channel, onMessage, enabled])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close(1000, 'component unmounted')
    }
  }, [connect])
}
