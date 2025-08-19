"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Search,
  Plus,
  Bell,
  MessageSquare,
  Phone,
  Smartphone,
  Copy,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Check,
  Wallet,
  Settings,
  X,
  Loader2,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWallet } from "@/contexts/WalletContext"
import { toast } from "sonner"
import { DatabaseTest } from "@/components/DatabaseTest"
import { WalletConnectButton } from "@/components/WalletConnectButton"
import { PhoneVerification } from "@/components/Settings/PhoneVerification"

import { deleteUserAlert, saveNotificationSettings, updateAlertNotificationStatus, cleanupDuplicateAlertMetrics, cleanupDuplicateNotificationSettings } from "@/lib/supabase"

interface TokenResult {
  address: string
  name: string
  symbol: string
  price: number
  marketCap: number
  volume24h: number
  priceChange24h: number
}

interface Alert {
  id: string
  ticker: string
  contractAddress: string
  tokenName: string
  status: string
  marketCap: number
  change24h: number
  volume24h: number
  price: number
  notificationsEnabled: boolean
  metrics?: {
    marketCapEnabled: boolean
    priceChangeEnabled: boolean
    volumeEnabled: boolean
    marketCapHigh: number
    marketCapLow: number
    priceChangeThreshold: number
    volumeThreshold: number
    volumePeriod: string
  }
}

type AlertMetrics = NonNullable<Alert['metrics']>

export default function Dashboard() {
  const { 
    walletAddress, 
    userId,
    isWalletConnected, 
    isLoading, 
    alerts: walletAlerts,
    saveAlerts,

    pushEnabled: contextPushEnabled,
    smsEnabled: contextSmsEnabled,
    callsEnabled: contextCallsEnabled,
    phoneVerified,
    phoneNumber,

    setNotificationSettings,
    refreshUserData,
    reloadAlerts,
    updateAlertNotification,
    updateAlertMetrics: updateContextAlertMetrics
  } = useWallet()
  



  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TokenResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedToken, setSelectedToken] = useState<TokenResult | null>(null)

  const [alerts, setAlerts] = useState<Alert[]>(walletAlerts || [])
  const [marketCapEnabled, setMarketCapEnabled] = useState(true)
  const [priceChangeEnabled, setPriceChangeEnabled] = useState(true)
  const [volumeEnabled, setVolumeEnabled] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [smsAlerts, setSmsAlerts] = useState(false)
  const [phoneCalls, setPhoneCalls] = useState(false)
  const [viewingMetrics, setViewingMetrics] = useState(false)
  const [returnToMetrics, setReturnToMetrics] = useState(false)
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null)
  const [editingAlertMetrics, setEditingAlertMetrics] = useState<AlertMetrics | null>(null)
  const [marketCapHigh, setMarketCapHigh] = useState([1000000])
  const [marketCapLow, setMarketCapLow] = useState([500000])
  const [priceChange, setPriceChange] = useState([20])
  const [volumePeriod, setVolumePeriod] = useState("5m")
  const [volumeThreshold, setVolumeThreshold] = useState(100000)



  // Debug context values
  console.log('🔍 Context values:', {
    contextPushEnabled,
    contextSmsEnabled,
    contextCallsEnabled
  });

  // Push is always enabled by default, SMS/Calls are off by default
  const [pushEnabled, setPushEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [callsEnabled, setCallsEnabled] = useState(false)

  const [showSettings, setShowSettings] = useState(false)
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false)
  const [pendingNotificationType, setPendingNotificationType] = useState<'sms' | 'calls' | null>(null)

  const searchTokens = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setIsSearching(true)
    try {
      // Check if it's a contract address (44 characters for Solana)
      const isContractAddress = query.length >= 32 && /^[A-Za-z0-9]+$/.test(query)

      let url = ""
      if (isContractAddress) {
        url = `https://api.dexscreener.com/latest/dex/tokens/${query}`
      } else {
        url = `https://api.dexscreener.com/latest/dex/search/?q=${encodeURIComponent(query)}`
      }

      const response = await fetch(url)
      const data = await response.json()

      let tokens: TokenResult[] = []

      if (data.pairs && data.pairs.length > 0) {
        tokens = data.pairs
          .filter((pair: any) => pair.chainId === "solana")
          .slice(0, 5)
          .map((pair: any) => ({
            address: pair.baseToken.address,
            name: pair.baseToken.name,
            symbol: pair.baseToken.symbol,
            price: Number.parseFloat(pair.priceUsd) || 0,
            marketCap: Number.parseFloat(pair.marketCap) || 0,
            volume24h: Number.parseFloat(pair.volume?.h24) || 0,
            priceChange24h: Number.parseFloat(pair.priceChange?.h24) || 0,
          }))
      }

      setSearchResults(tokens)
      setShowSearchResults(tokens.length > 0)
    } catch (error) {
      console.error("Error searching tokens:", error)
      setSearchResults([])
      setShowSearchResults(false)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchTokens(searchQuery)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const selectToken = (token: TokenResult) => {
    setSelectedToken(token)
    setSearchQuery("")
    setShowSearchResults(false)
  }

  const createAlert = async () => {
    if (!selectedToken) return
    
    if (!isWalletConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    const newAlert = {
      id: Date.now().toString(),
      ticker: selectedToken.symbol,
      contractAddress: selectedToken.address,
      tokenName: selectedToken.name,
      status: "active",
      marketCap: selectedToken.marketCap,
      change24h: selectedToken.priceChange24h,
      volume24h: selectedToken.volume24h,
      price: selectedToken.price,
      notificationsEnabled: true,
      metrics: {
        marketCapEnabled: marketCapEnabled,
        priceChangeEnabled: priceChangeEnabled,
        volumeEnabled: volumeEnabled,
        marketCapHigh: marketCapHigh[0],
        marketCapLow: marketCapLow[0],
        priceChangeThreshold: priceChange[0],
        volumeThreshold: volumeThreshold,
        volumePeriod: volumePeriod,
      },
    }

    const updatedAlerts = [...alerts, newAlert];
    setAlerts(updatedAlerts);
    
    try {
      // Save to Supabase via context
      await saveAlerts(updatedAlerts);
      toast.success("Alert created successfully");
    } catch (error) {
      toast.error("Failed to save alert");
      console.error("Error saving alert:", error);
    }
    
    setSelectedToken(null); // Clear selection after creating alert
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`
    }
    return `$${num}`
  }

  const toggleNotifications = async (alertId: string) => {
    try {
      // Find the current alert to get its current notification status
      const currentAlert = alerts.find(alert => alert.id === alertId);
      if (!currentAlert) {
        toast.error("Alert not found");
        return;
      }

      const newNotificationStatus = !currentAlert.notificationsEnabled;
      
      // Update in context (which will also update the database)
      await updateAlertNotification(alertId, newNotificationStatus);
      
      // Update local state
      const updatedAlerts = alerts.map((alert) =>
        alert.id === alertId ? { ...alert, notificationsEnabled: newNotificationStatus } : alert,
      );
      
      setAlerts(updatedAlerts);
      
      toast.success(`Notifications ${newNotificationStatus ? 'enabled' : 'disabled'} for this alert`);
    } catch (error) {
      toast.error("Failed to update notification settings");
      console.error("Error updating notification settings:", error);
    }
  }

  const deleteAlert = async (alertId: string) => {
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }
    
    try {
      // Delete from database first
      await deleteUserAlert(userId, alertId);
      
      // Update local state
      const updatedAlerts = alerts.filter((alert) => alert.id !== alertId);
      setAlerts(updatedAlerts);
      
      toast.success("Alert deleted successfully");
    } catch (error) {
      toast.error("Failed to delete alert");
      console.error("Error deleting alert:", error);
    }
  }

  const editAlert = (alert: Alert) => {
    if (viewingMetrics) {
      setViewingMetrics(false)
      setReturnToMetrics(true)
    }
    setEditingAlert(alert)
    setEditingAlertMetrics(alert.metrics || {
      marketCapEnabled: false,
      priceChangeEnabled: false,
      volumeEnabled: false,
      marketCapHigh: 1000000,
      marketCapLow: 500000,
      priceChangeThreshold: 20,
      volumeThreshold: 100000,
      volumePeriod: "24 hours"
    })
  }

  const saveAlertChanges = async () => {
    if (!editingAlert || !editingAlertMetrics) {
      toast.error("No alert to update");
      return;
    }

    try {
      // Update metrics in database and context
      await updateContextAlertMetrics(editingAlert.id, editingAlertMetrics);
      
      // Update local state to match context
      const updatedAlerts = alerts.map((alert) => 
        alert.id === editingAlert.id ? { ...alert, metrics: editingAlertMetrics } : alert
      );
      
      setAlerts(updatedAlerts);
      
      toast.success("Alert updated successfully");
    } catch (error) {
      toast.error("Failed to update alert");
      console.error("Error updating alert:", error);
    }
    
    setEditingAlert(null);
    setEditingAlertMetrics(null);
    
    if (returnToMetrics) {
      setViewingMetrics(true);
      setReturnToMetrics(false);
    }
  }

  const cancelEdit = () => {
    setEditingAlert(null)
    setEditingAlertMetrics(null)
    if (returnToMetrics) {
      setViewingMetrics(true)
      setReturnToMetrics(false)
    }
  }

  const cleanupAllDuplicates = async () => {
    try {
      console.log('🧹 Starting cleanup of all duplicate data...')
      
      if (userId) {

        
        // Clean up duplicate notification settings for the user
        await cleanupDuplicateNotificationSettings(userId)
        console.log('✅ Notification settings duplicates cleaned up')
      }
      
      // Clean up duplicates for each alert
      for (const alert of alerts) {
        await cleanupDuplicateAlertMetrics(alert.id)
      }
      
      // Refresh alerts to get clean data
      await reloadAlerts()
      
      toast.success("All duplicates cleaned up successfully")
      console.log('✅ Cleanup completed')
    } catch (error) {
      console.error('❌ Error during cleanup:', error)
      toast.error("Failed to clean up duplicates")
    }
  }

  // Sync context values with local state when they change
  // Push is always enabled, SMS/Calls only enabled if verified and enabled in context
  useEffect(() => {
    setPushEnabled(true) // Always keep push enabled
    setSmsEnabled(phoneVerified ? contextSmsEnabled : false)
    setCallsEnabled(phoneVerified ? contextCallsEnabled : false)
  }, [contextPushEnabled, contextSmsEnabled, contextCallsEnabled, phoneVerified])



  // Sync alerts from context when they change (important for page refresh)
  // Only sync when not editing and when alerts are actually different
  useEffect(() => {
    if (walletAlerts && walletAlerts.length > 0 && !editingAlert) {
      // Check if the alerts are actually different from current local state
      const currentAlertsString = JSON.stringify(alerts)
      const contextAlertsString = JSON.stringify(walletAlerts)
      
      if (currentAlertsString !== contextAlertsString) {
        console.log('🔄 Syncing alerts from context:', walletAlerts.length, 'alerts')
        setAlerts(walletAlerts)
      }
    }
  }, [walletAlerts, editingAlert, alerts])

  // Debug logging for state restoration
  useEffect(() => {
    console.log('🔄 Dashboard state update:', {
      isWalletConnected,
      userId,
      isLoading,
      alertsCount: walletAlerts?.length || 0,
      hasLocalStorage: !!localStorage.getItem("connectedWallet")
    })
  }, [isWalletConnected, userId, isLoading, walletAlerts])

  // Show loading state only if we have no wallet connection and no data
  if (isLoading && !isWalletConnected && !walletAlerts?.length) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="size-8 animate-spin mx-auto mb-4" />
              <p className="text-lg">Connecting to wallet...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }





  const handleNotificationSettingChange = async (setting: 'push' | 'sms' | 'calls', enabled: boolean) => {
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    // Check if trying to enable SMS or Calls without phone verification
    if ((setting === 'sms' || setting === 'calls') && enabled && !phoneVerified) {
      setPendingNotificationType(setting);
      setShowVerificationPrompt(true);
      return;
    }

    try {
      let newSettings;
      
      switch (setting) {
        case 'push':
          setPushEnabled(enabled);
          newSettings = { pushEnabled: enabled, smsEnabled, callsEnabled };
          break;
        case 'sms':
          setSmsEnabled(enabled);
          newSettings = { pushEnabled, smsEnabled: enabled, callsEnabled };
          break;
        case 'calls':
          setCallsEnabled(enabled);
          newSettings = { pushEnabled, smsEnabled, callsEnabled: enabled };
          break;
      }

      // Save to database
      await saveNotificationSettings(userId, newSettings);
      
      // Update context
      setNotificationSettings(newSettings);
      
      toast.success(`${setting.toUpperCase()} notifications ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error(`Failed to update ${setting} notifications`);
      console.error(`Error updating ${setting} notifications:`, error);
      
      // Revert local state on error
      switch (setting) {
        case 'push':
          setPushEnabled(!enabled);
          break;
        case 'sms':
          setSmsEnabled(!enabled);
          break;
        case 'calls':
          setCallsEnabled(!enabled);
          break;
      }
    }
  }

  const handleVerificationPromptResponse = (verify: boolean) => {
    setShowVerificationPrompt(false);
    
    if (verify && pendingNotificationType) {
      // User chose to verify - this would trigger the phone verification in settings
      toast.info(`Please complete phone verification in Settings to enable ${pendingNotificationType.toUpperCase()} notifications`);
      setShowSettings(true); // Open settings automatically
    }
    
    setPendingNotificationType(null);
  }



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-lg transition-all duration-300">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => (window.location.href = "/")} className="flex items-center gap-2">
              <ArrowLeft className="size-4" />
              Back to Home
            </Button>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold">
                M
              </div>
              <h1 className="text-xl font-bold">Memealert Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => {
                setShowSettings(true);
              }} className="flex items-center gap-2">
              <Settings className="size-4" />
              Settings
            </Button>
            <Button 
              variant="outline" 
              onClick={() => refreshUserData()} 
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            {isWalletConnected ? (
              <Button variant="outline" className="flex items-center gap-2">
                <Wallet className="size-4" />
                {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'Connected'}
              </Button>
            ) : (
              <div data-wallet-button className="flex justify-center">
                <WalletConnectButton />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-7xl relative overflow-hidden">
        {/* Background with grid pattern */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        
        {/* Corner glows */}
        <div className="absolute -bottom-6 -right-6 -z-10 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-3xl opacity-70"></div>
        <div className="absolute -top-6 -left-6 -z-10 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-secondary/30 to-primary/30 blur-3xl opacity-70"></div>
        
        {/* Main Dashboard Container with outline */}
        <div className="rounded-xl overflow-hidden shadow-2xl border border-border/40 bg-gradient-to-b from-background to-muted/20 relative">
          <div className="bg-background p-8">
            {/* Database Test Component - Hidden in production */}
            {process.env.NODE_ENV === 'development' && false && (
              <div className="mb-8">
                <DatabaseTest />
              </div>
            )}

            {/* Debug Info - Hidden in production */}
            {process.env.NODE_ENV === 'development' && false && (
              <div className="mb-8 p-4 border rounded-lg bg-muted/20">
                <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Context Alerts:</strong> {walletAlerts?.length || 0}</p>
                    <p><strong>Local Alerts:</strong> {alerts?.length || 0}</p>
                    <p><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
                    <p><strong>Wallet Connected:</strong> {isWalletConnected ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p><strong>User ID:</strong> {userId || 'None'}</p>
                    <p><strong>Wallet Address:</strong> {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'None'}</p>
                    <p><strong>Has LocalStorage:</strong> {typeof window !== 'undefined' && localStorage.getItem("connectedWallet") ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refreshUserData()}
                    disabled={isLoading}
                  >
                    Force Refresh Data
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => reloadAlerts()}
                    disabled={isLoading}
                  >
                    Reload Alerts
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      console.log('🔄 Manual sync - Context alerts:', walletAlerts);
                      console.log('🔄 Manual sync - Local alerts:', alerts);
                      if (walletAlerts && walletAlerts.length > 0) {
                        setAlerts(walletAlerts);
                        toast.success(`Synced ${walletAlerts.length} alerts from context`);
                      } else {
                        toast.error('No alerts in context to sync');
                      }
                    }}
                  >
                    Sync Alerts from Context
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={cleanupAllDuplicates}
                    disabled={isLoading}
                  >
                    Cleanup Duplicates
                  </Button>
                </div>
              </div>
            )}
            
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span className="ml-2 text-lg">Loading your data...</span>
              </div>
            ) : !isWalletConnected ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Wallet className="size-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                  <p className="text-muted-foreground mb-4">Connect your Solana wallet to view and manage your alerts</p>
                  <div data-wallet-connect-center className="flex justify-center">
                    <WalletConnectButton />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Column - Alert Configuration */}
                <div className="lg:col-span-3 space-y-8">
            {/* Search Token Section */}
            <Card className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 shadow-lg backdrop-blur transition-all hover:shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Search Solana Token</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
                  <Input
                    placeholder="Search by name or paste contract address..."
                    className="pl-10 bg-muted/50 border-border/40"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {showSearchResults && (
                  <div className="border border-border/40 rounded-lg bg-muted/20 max-h-80 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-4 text-center text-muted-foreground">Searching tokens...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((token) => (
                        <button
                          key={token.address}
                          onClick={() => selectToken(token)}
                          className="w-full p-4 text-left hover:bg-muted/50 border-b border-border/20 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">
                                  {token.name} ({token.symbol})
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground font-mono">
                                {token.address.slice(0, 8)}...{token.address.slice(-8)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">${token.price.toFixed(6)}</div>
                              <div className="text-sm text-muted-foreground">{formatNumber(token.marketCap)}</div>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">No tokens found</div>
                    )}
                  </div>
                )}

                {selectedToken && (
                  <div className="mt-4 p-4 bg-muted/30 border border-border/40 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {selectedToken.name} ({selectedToken.symbol})
                        </h3>
                        <p className="text-sm text-muted-foreground font-mono">{selectedToken.address}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${selectedToken.price.toFixed(6)}</div>
                        <div className="text-sm text-muted-foreground">{formatNumber(selectedToken.marketCap)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notification Channels */}
            <Card className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 shadow-lg backdrop-blur transition-all hover:shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Bell className="size-5" />
                  Notification Channels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-border/40 bg-muted/20 space-y-3 transition-all hover:bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-4 text-primary" />
                        <span className="font-medium">Push</span>
                      </div>
                      <Switch checked={pushEnabled} onCheckedChange={(enabled) => handleNotificationSettingChange('push', enabled)} />
                    </div>
                    <p className="text-sm text-muted-foreground">Browser alerts for desktop and mobile devices</p>
                  </div>

                  <div className="p-4 rounded-lg border border-border/40 bg-muted/20 space-y-3 transition-all hover:bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-green-500" />
                        <span className="font-medium">SMS</span>
                      </div>
                      <Switch 
                        checked={smsEnabled} 
                        onCheckedChange={(enabled) => handleNotificationSettingChange('sms', enabled)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">Text messages with token and metric updates</p>
                  </div>

                  <div className="p-4 rounded-lg border border-border/40 bg-muted/20 space-y-3 transition-all hover:bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="size-4 text-red-500" />
                        <span className="font-medium">Calls</span>
                      </div>
                      <Switch 
                        checked={callsEnabled} 
                        onCheckedChange={(enabled) => handleNotificationSettingChange('calls', enabled)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">Voice calls for critical alerts and wake-up alarms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Cap Alerts */}
            <Card className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 shadow-lg backdrop-blur transition-all hover:shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Market Cap Alerts</CardTitle>
                  <Switch checked={marketCapEnabled} onCheckedChange={setMarketCapEnabled} />
                </div>
              </CardHeader>
              {marketCapEnabled && (
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Notify when higher than:</Label>
                      <span className="text-sm font-mono">${marketCapHigh[0].toLocaleString()}</span>
                    </div>
                    <Slider
                      value={marketCapHigh}
                      onValueChange={setMarketCapHigh}
                      max={10000000}
                      min={100000}
                      step={100000}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Notify when lower than:</Label>
                      <span className="text-sm font-mono">${marketCapLow[0].toLocaleString()}</span>
                    </div>
                    <Slider
                      value={marketCapLow}
                      onValueChange={setMarketCapLow}
                      max={5000000}
                      min={10000}
                      step={10000}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Price Change Alerts */}
            <Card className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 shadow-lg backdrop-blur transition-all hover:shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Price Change Alerts</CardTitle>
                  <Switch checked={priceChangeEnabled} onCheckedChange={setPriceChangeEnabled} />
                </div>
              </CardHeader>
              {priceChangeEnabled && (
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Notify on ±{priceChange[0]}% change</Label>
                      <span className="text-sm font-mono">±{priceChange[0]}%</span>
                    </div>
                    <Slider
                      value={priceChange}
                      onValueChange={setPriceChange}
                      max={100}
                      min={5}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Volume Alerts */}
            <Card className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 shadow-lg backdrop-blur transition-all hover:shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Volume Alerts</CardTitle>
                  <Switch checked={volumeEnabled} onCheckedChange={setVolumeEnabled} />
                </div>
              </CardHeader>
              {volumeEnabled && (
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Volume Period</label>
                      <Select value={volumePeriod} onValueChange={setVolumePeriod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5m">5 minutes</SelectItem>
                          <SelectItem value="1h">1 hour</SelectItem>
                          <SelectItem value="6h">6 hours</SelectItem>
                          <SelectItem value="24h">24 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Volume Threshold:</span>
                        <span className="text-sm text-muted-foreground">${volumeThreshold.toLocaleString()}</span>
                      </div>
                      <Slider
                        value={[volumeThreshold]}
                        onValueChange={([value]) => setVolumeThreshold(value)}
                        max={10000000}
                        min={1000}
                        step={1000}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right Column - Alerts */}
          <div className="lg:col-span-2">
            <div>
              <Card className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 shadow-lg backdrop-blur transition-all hover:shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Alerts</CardTitle>
                    <button 
                      onClick={() => setViewingMetrics(true)} 
                      className="px-3 py-1 bg-muted rounded-md text-xs flex items-center gap-1 hover:bg-muted/80 transition-colors"
                    >
                      <Eye className="size-3" />
                      View Metrics
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="size-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">No alerts yet</p>
                      <p className="text-sm">Create your first alert to get started with memealert notifications.</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/30 transition-all hover:shadow-md backdrop-blur"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Status Badge */}
                          <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                            alert.notificationsEnabled 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {alert.notificationsEnabled ? (
                              <CheckCircle className="size-3" />
                            ) : (
                              <XCircle className="size-3" />
                            )}
                            {alert.notificationsEnabled ? "active" : "inactive"}
                          </div>

                          {/* Token Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">{alert.ticker}</span>
                              <button
                                onClick={() => copyToClipboard(alert.contractAddress)}
                                className="text-xs text-muted-foreground hover:text-foreground font-mono"
                                title={alert.contractAddress}
                              >
                                {alert.contractAddress.slice(0, 8)}...{alert.contractAddress.slice(-4)}
                              </button>
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <div className="text-muted-foreground">Market Cap</div>
                                <div className="font-medium">{formatNumber(alert.marketCap)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">24h Change</div>
                                <div className={`font-medium ${alert.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                                  {alert.change24h >= 0 ? "+" : ""}{alert.change24h}%
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">24h Volume</div>
                                <div className="font-medium">{formatNumber(alert.volume24h)}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          <div title={alert.notificationsEnabled ? "Click to disable notifications" : "Click to enable notifications"}>
                            <Bell 
                              className={`size-4 cursor-pointer transition-colors ${
                                alert.notificationsEnabled 
                                  ? "text-primary fill-current" 
                                  : "text-muted-foreground"
                              }`}
                              onClick={() => toggleNotifications(alert.id)}
                            />
                          </div>
                          <div title="Edit alert settings">
                            <Edit 
                              className="size-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" 
                              onClick={() => editAlert(alert)}
                            />
                          </div>
                          <div title="Delete alert">
                            <Trash2 
                              className="size-4 text-red-500 cursor-pointer hover:text-red-600 transition-colors" 
                              onClick={() => deleteAlert(alert.id)}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        )}





        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Settings</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                  <X className="size-4" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Phone Verification Section */}
                <div>
                  <h4 className="text-base font-semibold mb-4">Phone Verification</h4>
                  <PhoneVerification />
                  <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Why verify your phone?</strong> Phone verification enables SMS alerts and voice call notifications for your token alerts. 
                      You'll receive real-time notifications even when you're away from your computer.
                    </p>
                  </div>
                </div>

                {/* Wallet Info Section */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Connected Wallet</h4>
                  <div className="text-sm text-muted-foreground">
                    {walletAddress ? (
                      <div className="space-y-2">
                        <div className="font-mono bg-muted p-2 rounded text-xs break-all">
                          {walletAddress}
                        </div>
                        <div className="text-xs">
                          User ID: {userId || 'Loading...'}
                        </div>
                      </div>
                    ) : (
                      "No wallet connected"
                    )}
                  </div>
                </div>


              </div>
            </div>
          </div>
        )}

        {editingAlert && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border/40 bg-gradient-to-b from-background to-muted/10 shadow-2xl backdrop-blur">
              <CardHeader>
                <CardTitle>Edit Alert: {editingAlert.ticker}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Channels Section */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Notification Channels</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-4 text-primary" />
                        <span className="text-sm">Push Notifications</span>
                      </div>
                      <Switch checked={pushEnabled} onCheckedChange={(enabled) => handleNotificationSettingChange('push', enabled)} />
                    </div>
                    
                    <div className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="size-4 text-green-500" />
                          <span className="text-sm">SMS Alerts</span>
                        </div>
                        <Switch 
                          checked={smsEnabled} 
                          onCheckedChange={(enabled) => handleNotificationSettingChange('sms', enabled)}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="size-4 text-red-500" />
                          <span className="text-sm">Phone Calls</span>
                        </div>
                        <Switch 
                          checked={callsEnabled} 
                          onCheckedChange={(enabled) => handleNotificationSettingChange('calls', enabled)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics Configuration Section */}
                {editingAlertMetrics && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Alert Metrics</Label>

                  {/* Market Cap Alerts */}
                  <div className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Market Cap Alerts</span>
                      <Switch
                        checked={editingAlertMetrics?.marketCapEnabled || false}
                        onCheckedChange={(checked) =>
                          editingAlertMetrics && setEditingAlertMetrics({ ...editingAlertMetrics, marketCapEnabled: checked })
                        }
                      />
                    </div>
                    {editingAlertMetrics.marketCapEnabled && (
                      <div className="space-y-3 pl-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Higher than:</span>
                            <span>${editingAlertMetrics.marketCapHigh?.toLocaleString()}</span>
                          </div>
                          <Slider
                            value={[editingAlertMetrics.marketCapHigh || 1000000]}
                            onValueChange={([value]) =>
                              setEditingAlertMetrics({ ...editingAlertMetrics, marketCapHigh: value })
                            }
                            max={10000000}
                            min={100000}
                            step={100000}
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Lower than:</span>
                            <span>${editingAlertMetrics.marketCapLow?.toLocaleString()}</span>
                          </div>
                          <Slider
                            value={[editingAlertMetrics.marketCapLow || 500000]}
                            onValueChange={([value]) =>
                              setEditingAlertMetrics({ ...editingAlertMetrics, marketCapLow: value })
                            }
                            max={5000000}
                            min={10000}
                            step={10000}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Price Change Alerts */}
                  <div className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Price Change Alerts</span>
                      <Switch
                        checked={editingAlertMetrics.priceChangeEnabled}
                        onCheckedChange={(checked) =>
                          setEditingAlertMetrics({ ...editingAlertMetrics, priceChangeEnabled: checked })
                        }
                      />
                    </div>
                    {editingAlertMetrics.priceChangeEnabled && (
                      <div className="pl-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Notify on ±{editingAlertMetrics.priceChangeThreshold}% change</span>
                          <span>±{editingAlertMetrics.priceChangeThreshold}%</span>
                        </div>
                        <Slider
                          value={[editingAlertMetrics.priceChangeThreshold || 20]}
                          onValueChange={([value]) =>
                            setEditingAlertMetrics({ ...editingAlertMetrics, priceChangeThreshold: value })
                          }
                          max={100}
                          min={5}
                          step={5}
                        />
                      </div>
                    )}
                  </div>

                  {/* Volume Alerts */}
                  <div className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Volume Alerts</span>
                      <Switch
                        checked={editingAlertMetrics.volumeEnabled}
                        onCheckedChange={(checked) =>
                          setEditingAlertMetrics({ ...editingAlertMetrics, volumeEnabled: checked })
                        }
                      />
                    </div>
                    {editingAlertMetrics.volumeEnabled && (
                      <div className="space-y-3 pl-4">
                        <div>
                          <Label className="text-sm mb-2 block">Volume Period</Label>
                          <Select
                            value={editingAlertMetrics.volumePeriod}
                            onValueChange={(value) =>
                              setEditingAlertMetrics({ ...editingAlertMetrics, volumePeriod: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5m">5 minutes</SelectItem>
                              <SelectItem value="1h">1 hour</SelectItem>
                              <SelectItem value="6h">6 hours</SelectItem>
                              <SelectItem value="24h">24 hours</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Volume Threshold:</span>
                            <span>${editingAlertMetrics.volumeThreshold?.toLocaleString()}</span>
                          </div>
                          <Slider
                            value={[editingAlertMetrics.volumeThreshold || 100000]}
                            onValueChange={([value]) =>
                              setEditingAlertMetrics({ ...editingAlertMetrics, volumeThreshold: value })
                            }
                            max={10000000}
                            min={1000}
                            step={1000}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={saveAlertChanges}>
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {viewingMetrics && !editingAlert && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border/40 bg-gradient-to-b from-background to-muted/10 shadow-2xl backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold">Alerts</CardTitle>
                  <div className="px-3 py-1 bg-muted rounded-md text-xs flex items-center gap-1">
                    <Eye className="size-3" />
                    View Metrics
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Status Badge */}
                        <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                          alert.notificationsEnabled 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {alert.notificationsEnabled ? (
                            <CheckCircle className="size-3" />
                          ) : (
                            <XCircle className="size-3" />
                          )}
                          {alert.notificationsEnabled ? "active" : "inactive"}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{alert.ticker}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {alert.contractAddress.slice(0, 8)}...{alert.contractAddress.slice(-4)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="text-muted-foreground">Market Cap</div>
                              <div className="font-medium">{formatNumber(alert.marketCap)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">24h Change</div>
                              <div className={`font-medium ${alert.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                                {alert.change24h >= 0 ? "+" : ""}{alert.change24h}%
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">24h Volume</div>
                              <div className="font-medium">{formatNumber(alert.volume24h)}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Bell className={`size-4 ${
                          alert.notificationsEnabled 
                            ? "text-primary fill-current" 
                            : "text-muted-foreground"
                        }`} />
                        <div title="Edit alert settings">
                          <Edit 
                            className="size-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" 
                            onClick={() => {
                              editAlert(alert);
                              setViewingMetrics(false);
                            }}
                          />
                        </div>
                        <div title="Delete alert">
                          <Trash2 
                            className="size-4 text-red-500 cursor-pointer hover:text-red-600 transition-colors" 
                            onClick={() => {
                              deleteAlert(alert.id);
                              if (alerts.length <= 1) {
                                setViewingMetrics(false);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={() => setViewingMetrics(false)}>Close</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Alert Button - shown when token is selected and not editing */}
        {selectedToken && !editingAlert && !viewingMetrics && (
          <div className="fixed bottom-8 right-8 z-30">
            <Button onClick={createAlert} size="lg" className="shadow-lg">
              <Plus className="size-4 mr-2" />
              Create Alert for {selectedToken.symbol}
            </Button>
          </div>
        )}

        {/* Phone Verification Prompt Dialog */}
        {showVerificationPrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-b from-background to-muted/10 border border-border/40 rounded-lg p-6 max-w-md w-full shadow-2xl backdrop-blur">
              <div className="flex items-center gap-3 mb-4">
                <Phone className="size-6 text-yellow-500" />
                <h3 className="text-lg font-semibold">Phone Verification Required</h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  To enable {pendingNotificationType?.toUpperCase()} notifications, you need to verify your phone number first.
                </p>
                
                <p className="text-sm">
                  Would you like to verify your phone number now?
                </p>
                
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleVerificationPromptResponse(false)}
                    className="flex-1"
                  >
                    Not Now
                  </Button>
                  <Button 
                    onClick={() => handleVerificationPromptResponse(true)}
                    className="flex-1"
                  >
                    Verify Phone
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 dark:ring-white/10 pointer-events-none"></div>
        </div>
      </main>
    </div>
  )
}
