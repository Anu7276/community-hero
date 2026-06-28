import { useState } from 'react'

export function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  const supported = typeof Notification !== 'undefined'

  async function requestPermission() {
    if (!supported) return false
    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }

  function notify(title, body) {
    if (!supported || Notification.permission !== 'granted') return
    try {
      const n = new Notification(title, {
        body,
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>",
        tag: 'community-hero',
        renotify: true,
      })
      setTimeout(() => n.close(), 5000)
    } catch (e) {}
  }

  function notifyNewIssue(issue) {
    notify(
      `🚨 New ${issue.issue_type?.replace(/_/g, ' ')} Reported`,
      `${issue.issue_address || issue.area_description || 'Unknown location'} · ${issue.severity}`
    )
  }

  function notifyIssueUpdate(issue) {
    notify(
      `✅ Issue ${issue.status?.replace(/_/g, ' ').toUpperCase()}`,
      `${issue.issue_type?.replace(/_/g, ' ')} at ${issue.issue_address || issue.area_description || 'Unknown location'}`
    )
  }

  return { supported, permission, requestPermission, notify, notifyNewIssue, notifyIssueUpdate }
}
