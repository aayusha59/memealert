"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Bell, MessageSquare, Phone, Smartphone, Loader2, AlertCircle } from 'lucide-react'

interface TestNotificationsProps {
  userId?: string
  userPhone?: string
  isPhoneVerified?: boolean
  userAlerts?: UserAlert[]
}

interface UserAlert {
  id: string
  ticker: string
  tokenName: string
  contractAddress: string
}

export function TestNotifications({ userId, userPhone, isPhoneVerified, userAlerts: propUserAlerts }: TestNotificationsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [testChannels, setTestChannels] = useState({
    push: true,
    sms: false,
    calls: false
  })
  const [alertType, setAlertType] = useState<'market_cap' | 'price_change' | 'volume'>('market_cap')
  const [userAlerts, setUserAlerts] = useState<UserAlert[]>([])
  const [selectedAlertId, setSelectedAlertId] = useState<string>('')
  const [loadingAlerts, setLoadingAlerts] = useState(false)

  // Use alerts from props or fetch them
  useEffect(() => {
    if (propUserAlerts && propUserAlerts.length > 0) {
      console.log('✅ Using alerts from props:', propUserAlerts)
      setUserAlerts(propUserAlerts)
      setSelectedAlertId(propUserAlerts[0].id)
    } else if (userId) {
      console.log('🔍 No alerts in props, fetching from API')
      fetchUserAlerts()
    }
  }, [userId, propUserAlerts])

  const fetchUserAlerts = async () => {
    if (!userId) return
    
    console.log('🔍 Fetching alerts for userId:', userId)
    setLoadingAlerts(true)
    try {
      const response = await fetch(`/api/alerts/user?userId=${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 API Response:', data)
        
        if (data.alerts && data.alerts.length > 0) {
          console.log('✅ Found alerts:', data.alerts)
          setUserAlerts(data.alerts)
          setSelectedAlertId(data.alerts[0].id)
        } else {
          console.log('⚠️ No alerts found in response:', data)
          toast.info(`No alerts found. Debug info: Total: ${data.debug?.totalAlerts || 0}, Active: ${data.debug?.activeAlerts || 0}`)
        }
      } else {
        const errorData = await response.json()
        console.error('❌ API Error:', errorData)
        toast.error(`Failed to load your alerts: ${errorData.error}`)
      }
    } catch (error) {
      console.error('❌ Error fetching user alerts:', error)
      toast.error('Could not load your alerts')
    } finally {
      setLoadingAlerts(false)
    }
  }

  const handleTestNotificationWithChannels = async (channels: { push: boolean; sms: boolean; calls: boolean }) => {
    if (!userId) {
      toast.error('User not authenticated')
      return
    }

    if ((channels.sms || channels.calls) && !isPhoneVerified) {
      toast.error('Phone verification required for SMS/Call notifications')
      return
    }

    const selectedAlert = userAlerts.find(alert => alert.id === selectedAlertId)
    if (!selectedAlert) {
      toast.error('Please select an alert to test')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/notifications/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          tokenSymbol: selectedAlert.ticker,
          tokenName: selectedAlert.tokenName,
          alertId: selectedAlert.id,
          alertType,
          channels,
          userPhone: isPhoneVerified ? userPhone : undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        const sentChannels = []
        if (result.results.push) sentChannels.push('Push')
        if (result.results.sms) sentChannels.push('SMS')
        if (result.results.voice) sentChannels.push('Voice')
        
        toast.success(`Test notification sent via: ${sentChannels.join(', ') || 'None'}`)
      } else {
        toast.error(result.error || 'Failed to send test notification')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast.error('Failed to send test notification')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestNotification = async () => {
    return handleTestNotificationWithChannels(testChannels)
  }

  // Keep the rest of the original handleTestNotification logic for the "Send All Selected" button
  const handleOriginalTestNotification = async () => {
    if (!userId) {
      toast.error('User not authenticated')
      return
    }

    if ((testChannels.sms || testChannels.calls) && !isPhoneVerified) {
      toast.error('Phone verification required for SMS/Call notifications')
      return
    }

    const selectedAlert = userAlerts.find(alert => alert.id === selectedAlertId)
    if (!selectedAlert) {
      toast.error('Please select an alert to test')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/notifications/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          tokenSymbol: selectedAlert.ticker,
          tokenName: selectedAlert.tokenName,
          alertId: selectedAlert.id,
          alertType,
          channels: testChannels,
          userPhone: isPhoneVerified ? userPhone : undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        const sentChannels = []
        if (result.results.push) sentChannels.push('Push')
        if (result.results.sms) sentChannels.push('SMS')
        if (result.results.voice) sentChannels.push('Voice')
        
        toast.success(`Test notification sent via: ${sentChannels.join(', ') || 'None'}`)
      } else {
        toast.error(result.error || 'Failed to send test notification')
      }
    } catch (error) {
      console.error('Error sending test notification:', error)
      toast.error('Failed to send test notification')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProcessAlerts = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/alerts/process', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        const { stats } = result
        toast.success(
          `Alert processing complete: ${stats.processed} processed, ${stats.triggered} triggered, ${stats.sent} sent`
        )
      } else {
        toast.error('Failed to process alerts')
      }
    } catch (error) {
      console.error('Error processing alerts:', error)
      toast.error('Failed to process alerts')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 shadow-lg backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Bell className="size-5" />
          Test Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Token Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select Token</Label>
          {loadingAlerts ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="size-4 mr-2 animate-spin" />
              <span className="text-sm">Loading your alerts...</span>
            </div>
          ) : userAlerts.length > 0 ? (
            <Select value={selectedAlertId} onValueChange={setSelectedAlertId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a token" />
              </SelectTrigger>
              <SelectContent>
                {userAlerts.map(alert => (
                  <SelectItem key={alert.id} value={alert.id}>
                    {alert.ticker} ({alert.tokenName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md border border-border/40">
              <AlertCircle className="size-4 text-yellow-500" />
              <span className="text-sm">No alerts found. Create an alert first.</span>
            </div>
          )}
        </div>

        {/* Alert Type Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Alert Type</Label>
          <Select value={alertType} onValueChange={(value: any) => setAlertType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market_cap">Market Cap Alert</SelectItem>
              <SelectItem value="price_change">Price Change Alert</SelectItem>
              <SelectItem value="volume">Volume Alert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Channel Selection */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Test Channels</Label>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="size-4 text-primary" />
                  <span className="text-sm font-medium">Push</span>
                </div>
                <Switch 
                  checked={testChannels.push} 
                  onCheckedChange={(enabled) => setTestChannels(prev => ({ ...prev, push: enabled }))} 
                />
              </div>
              <p className="text-xs text-muted-foreground">Browser notifications</p>
            </div>

            <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-green-500" />
                  <span className="text-sm font-medium">SMS</span>
                </div>
                <Switch 
                  checked={testChannels.sms} 
                  onCheckedChange={(enabled) => setTestChannels(prev => ({ ...prev, sms: enabled }))}
                  disabled={!isPhoneVerified}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isPhoneVerified ? 'Text message alerts' : 'Phone verification required'}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-red-500" />
                  <span className="text-sm font-medium">Calls</span>
                </div>
                <Switch 
                  checked={testChannels.calls} 
                  onCheckedChange={(enabled) => setTestChannels(prev => ({ ...prev, calls: enabled }))}
                  disabled={!isPhoneVerified}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isPhoneVerified ? 'Voice call alerts' : 'Phone verification required'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => handleTestNotificationWithChannels(testChannels)}
            disabled={isLoading || userAlerts.length === 0}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Bell className="size-4 mr-2" />
            )}
            Send All Selected
          </Button>
          
          <Button 
            onClick={handleProcessAlerts}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Bell className="size-4 mr-2" />
            )}
            Process All Alerts
          </Button>
        </div>

        {/* Info */}
        <div className="p-4 bg-muted/30 backdrop-blur-sm rounded-lg border border-border/20">
          <div className="flex items-start gap-3">
            <div className="size-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="size-3 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Testing Notifications</p>
              <p className="text-sm text-muted-foreground">
                Use these controls to test your notification channels before relying on automatic alerts. 
                Make sure your phone is verified for SMS and voice notifications.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
