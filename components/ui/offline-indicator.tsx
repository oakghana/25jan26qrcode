"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WifiOff, Wifi, Download } from "lucide-react"

export function OfflineIndicator() {
  const [mounted, setMounted] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [showOfflineAlert, setShowOfflineAlert] = useState(false)
  const [hasPendingData, setHasPendingData] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const updateOnlineStatus = () => {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true
      setIsOnline(online)

      if (!online) {
        setShowOfflineAlert(true)
        // Check for pending offline data
        checkPendingData()
      } else if (showOfflineAlert) {
        // Show brief "back online" message and trigger sync
        setTimeout(() => setShowOfflineAlert(false), 3000)
        syncPendingData()
      }
    }

    const checkPendingData = async () => {
      try {
        // Check IndexedDB for pending attendance records
        const request = indexedDB.open("QCCAttendance", 1)
        request.onsuccess = () => {
          const db = request.result
          if (db.objectStoreNames.contains("pendingAttendance")) {
            const transaction = db.transaction(["pendingAttendance"], "readonly")
            const store = transaction.objectStore("pendingAttendance")
            const countRequest = store.count()
            countRequest.onsuccess = () => {
              setHasPendingData(countRequest.result > 0)
            }
          }
        }
      } catch (error) {
        console.error("[Offline] Error checking pending data:", error)
      }
    }

    const syncPendingData = async () => {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        try {
          // Trigger background sync
          const registration = await navigator.serviceWorker.ready
          if ("sync" in registration) {
            await registration.sync.register("attendance")
            console.log("[Offline] Background sync registered")
          }
        } catch (error) {
          console.error("[Offline] Background sync failed:", error)
        }
      }
    }

    updateOnlineStatus()
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)

    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
    }
  }, [showOfflineAlert, mounted])

  if (!mounted || !showOfflineAlert) return null

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Alert
        className={`${
          isOnline
            ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200"
            : "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-200"
        } shadow-lg backdrop-blur-sm`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <AlertDescription className="font-medium">
              {isOnline
                ? "Back online! Data will sync automatically."
                : "You are offline. Attendance will be saved locally."}
            </AlertDescription>
          </div>
          {!isOnline && hasPendingData && (
            <div className="flex items-center gap-1 text-xs">
              <Download className="h-3 w-3" />
              <span>Pending sync</span>
            </div>
          )}
        </div>
      </Alert>
    </div>
  )
}
