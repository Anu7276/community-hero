import { useEffect } from 'react'
import { io } from 'socket.io-client'

let socket = null

function getSocket() {
  if (!socket || socket.disconnected) {
    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })
  }
  return socket
}

export function useSocket(onNewIssue, onIssueUpdated) {
  useEffect(() => {
    const s = getSocket()

    const handleNew = (issue) => onNewIssue?.(issue)
    const handleUpdate = (issue) => onIssueUpdated?.(issue)
    const handleConnect = () => console.log('🔌 Socket connected')
    const handleDisconnect = () => console.log('🔌 Socket disconnected')

    s.on('new_issue', handleNew)
    s.on('issue_updated', handleUpdate)
    s.on('connect', handleConnect)
    s.on('disconnect', handleDisconnect)

    return () => {
      s.off('new_issue', handleNew)
      s.off('issue_updated', handleUpdate)
      s.off('connect', handleConnect)
      s.off('disconnect', handleDisconnect)
    }
  }, [])
}
