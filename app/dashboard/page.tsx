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
import { deleteUserAlert, saveNotificationSettings, updateAlertMetrics, updateAlertNotificationStatus } from "@/lib/supabase"

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
    phoneNumber: contextPhoneNumber,
    isPhoneVerified: contextIsPhoneVerified,
    verificationStep: contextVerificationStep,
    pushEnabled: contextPushEnabled,
    smsEnabled: contextSmsEnabled,
    callsEnabled: contextCallsEnabled,
    setPhoneVerified,
    setNotificationSettings,
    refreshUserData,
    reloadAlerts,
    updateAlertNotification
  } = useWallet()
  
  const [showWalletModal, setShowWalletModal] = useState(false)

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

  const [phoneNumber, setPhoneNumber] = useState(contextPhoneNumber || "")
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isPhoneVerified, setIsPhoneVerified] = useState(contextIsPhoneVerified)
  const [verificationStep, setVerificationStep] = useState<"phone" | "code" | "verified">(contextVerificationStep)

  const [pushEnabled, setPushEnabled] = useState(contextPushEnabled)
  const [smsEnabled, setSmsEnabled] = useState(contextSmsEnabled)
  const [callsEnabled, setCallsEnabled] = useState(contextCallsEnabled)

  const [showSettings, setShowSettings] = useState(false)

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
      setShowWalletModal(true);
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
      // Update metrics in database
      await updateAlertMetrics(editingAlert.id, editingAlertMetrics);
      
      // Update local state
      const updatedAlerts = alerts.map((alert) => 
        alert.id === editingAlert.id ? { ...alert, metrics: editingAlertMetrics } : alert
      );
      
      setAlerts(updatedAlerts);
      
      // Refresh context alerts to ensure they're in sync
      await reloadAlerts();
      
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

  // Sync context values with local state when they change
  useEffect(() => {
    setPhoneNumber(contextPhoneNumber || "")
    setIsPhoneVerified(contextIsPhoneVerified)
    setVerificationStep(contextVerificationStep)
    setPushEnabled(contextPushEnabled)
    setSmsEnabled(contextSmsEnabled)
    setCallsEnabled(contextCallsEnabled)
  }, [contextPhoneNumber, contextIsPhoneVerified, contextVerificationStep, contextPushEnabled, contextSmsEnabled, contextCallsEnabled])

  // Sync alerts from context when they change (important for page refresh)
  useEffect(() => {
    if (walletAlerts && walletAlerts.length > 0) {
      console.log('🔄 Syncing alerts from context:', walletAlerts.length, 'alerts')
      setAlerts(walletAlerts)
    }
  }, [walletAlerts])

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

  const handleConnectWallet = async (walletType: string) => {
    try {
      await refreshUserData()
      setShowWalletModal(false)
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    }
  }

  const sendVerificationCode = async () => {
    if (!phoneNumber) return
    if (!isWalletConnected || !userId) {
      toast.error("Please connect your wallet first");
      setShowWalletModal(true);
      return;
    }

    setIsVerifying(true)
    try {
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, userId }),
      })

      if (response.ok) {
        setVerificationStep("code")
        toast.success("Verification code sent");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to send verification code");
      }
    } catch (error) {
      toast.error("Error sending verification code");
      console.error("Error sending verification code:", error);
    } finally {
      setIsVerifying(false)
    }
  }

  const verifyCode = async () => {
    if (!verificationCode) return
    if (!isWalletConnected || !userId) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsVerifying(true)
    try {
      const response = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code: verificationCode, userId }),
      })

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsPhoneVerified(true)
          setVerificationStep("verified")
          setPhoneVerified(true, phoneNumber)
          toast.success("Phone number verified successfully");
          // Update notification settings to enable SMS
          setSmsEnabled(true);
          setNotificationSettings({
            pushEnabled,
            smsEnabled: true,
            callsEnabled
          });
        } else {
          toast.error("Invalid verification code");
        }
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to verify code");
      }
    } catch (error) {
      toast.error("Error verifying code");
      console.error("Error verifying code:", error);
    } finally {
      setIsVerifying(false)
    }
  }

  const handleNotificationSettingChange = async (setting: 'push' | 'sms' | 'calls', enabled: boolean) => {
    if (!userId) {
      toast.error("User not authenticated");
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
      
      // Refresh user data to ensure everything is in sync
      await refreshUserData();
      
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

  const changePhoneNumber = async () => {
    setPhoneNumber("")
    setIsPhoneVerified(false)
    setVerificationStep("phone")
    setPhoneVerified(false, "")
    setSmsEnabled(false)
    setCallsEnabled(false)
    setNotificationSettings({
      pushEnabled,
      smsEnabled: false,
      callsEnabled: false
    });
    
    // Refresh user data to ensure everything is in sync
    await refreshUserData();
    
    setShowSettings(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => (window.location.href = "/")} className="flex items-center gap-2">
              <ArrowLeft className="size-4" />
              Back to Home
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">M</span>
              </div>
              <h1 className="text-xl font-bold">Memealert Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowSettings(true)} className="flex items-center gap-2">
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
                {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'Disconnect'}
              </Button>
            ) : (
              <Button onClick={() => setShowWalletModal(true)} className="flex items-center gap-2">
                <Wallet className="size-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-7xl relative">
        {/* Temporary Database Test Component */}
        <div className="mb-8">
          <DatabaseTest />
        </div>

        {/* Debug Info */}
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
          </div>
        </div>
        
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
              <Button onClick={() => setShowWalletModal(true)}>
                Connect Wallet
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column - Alert Configuration */}
          <div className="lg:col-span-3 space-y-8">
            {/* Search Token Section */}
            <Card className="border-border/40 bg-gradient-to-b from-background to-muted/10">
              <CardHeader>
                <CardTitle className="text-xl">Search Solana Token</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
                  <Input
                    placeholder="Search by name or paste contract address..."
                    className="pl-10 bg-muted/50 border-border/40"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />

                  {showSearchResults && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border/40 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
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
                </div>

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
            <Card className="border-border/40 bg-gradient-to-b from-background to-muted/10">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Bell className="size-5" />
                  Notification Channels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-4" />
                        <span className="font-medium">Push</span>
                      </div>
                      <Switch checked={pushEnabled} onCheckedChange={(enabled) => handleNotificationSettingChange('push', enabled)} />
                    </div>
                    <p className="text-sm text-muted-foreground">Browser alerts for desktop and mobile devices</p>
                  </div>

                  <div className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4" />
                        <span className="font-medium">SMS</span>
                      </div>
                      <Switch checked={smsEnabled} onCheckedChange={(enabled) => handleNotificationSettingChange('sms', enabled)} />
                    </div>
                    <p className="text-sm text-muted-foreground">Text messages with token and metric updates</p>
                    {smsEnabled && (
                      <div className="space-y-2">
                        {verificationStep === "phone" && (
                          <div className="space-y-2">
                            <input
                              type="tel"
                              placeholder="Enter phone number"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                            />
                            <button
                              onClick={sendVerificationCode}
                              disabled={isVerifying || !phoneNumber}
                              className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
                            >
                              {isVerifying ? "Sending..." : "Send Code"}
                            </button>
                          </div>
                        )}
                        {verificationStep === "code" && (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Enter verification code"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value)}
                              className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                            />
                            <button
                              onClick={verifyCode}
                              disabled={isVerifying || !verificationCode}
                              className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
                            >
                              {isVerifying ? "Verifying..." : "Verify"}
                            </button>
                          </div>
                        )}
                        {verificationStep === "verified" && (
                          <div className="text-sm text-green-500 flex items-center gap-1">
                            <Check className="size-4" />
                            Phone verified: {phoneNumber}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="size-4" />
                        <span className="font-medium">Calls</span>
                      </div>
                      <Switch checked={callsEnabled} onCheckedChange={(enabled) => handleNotificationSettingChange('calls', enabled)} />
                    </div>
                    <p className="text-sm text-muted-foreground">Voice calls for critical alerts and wake-up alarms</p>
                    {callsEnabled && !isPhoneVerified && (
                      <div className="text-sm text-muted-foreground">Enable SMS first to verify your phone number</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Cap Alerts */}
            <Card className="border-border/40 bg-gradient-to-b from-background to-muted/10">
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
            <Card className="border-border/40 bg-gradient-to-b from-background to-muted/10">
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
            <Card className="border-border/40 bg-gradient-to-b from-background to-muted/10">
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
            <div className="sticky top-24">
              <Card className="border-border/40 bg-gradient-to-b from-background to-muted/10">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Alerts</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setViewingMetrics(true)} className="text-xs">
                      <Eye className="size-3 mr-1" />
                      View Metrics
                    </Button>
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
                        className="flex items-center justify-between p-4 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Status Badge */}
                          <Badge variant={alert.notificationsEnabled ? "default" : "secondary"} className="shrink-0">
                            {alert.notificationsEnabled ? (
                              <CheckCircle className="size-3 mr-1" />
                            ) : (
                              <XCircle className="size-3 mr-1" />
                            )}
                            {alert.notificationsEnabled ? "active" : "inactive"}
                          </Badge>

                          {/* Token Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-semibold text-base">{alert.ticker}</span>
                              <button
                                onClick={() => copyToClipboard(alert.contractAddress)}
                                className="text-sm text-muted-foreground hover:text-foreground font-mono truncate max-w-32 flex items-center gap-1"
                                title={alert.contractAddress}
                              >
                                {alert.contractAddress.slice(0, 8)}...{alert.contractAddress.slice(-6)}
                                <Copy className="size-3" />
                              </button>
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">Market Cap</div>
                                <div className="font-medium">{formatNumber(alert.marketCap)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">24h Change</div>
                                <div
                                  className={`font-medium ${alert.change24h >= 0 ? "text-green-500" : "text-red-500"}`}
                                >
                                  {alert.change24h >= 0 ? "+" : ""}
                                  {alert.change24h}%
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground text-xs mb-1">24h Volume</div>
                                <div className="font-medium">{formatNumber(alert.volume24h)}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`size-9 p-0 transition-colors ${
                              alert.notificationsEnabled 
                                ? "text-primary hover:text-primary/80" 
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={() => toggleNotifications(alert.id)}
                            title={alert.notificationsEnabled ? "Click to disable notifications" : "Click to enable notifications"}
                          >
                            <Bell 
                              className={`size-4 transition-all ${
                                alert.notificationsEnabled 
                                  ? "fill-current text-primary" 
                                  : "text-muted-foreground"
                              }`} 
                            />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-9 p-0"
                            onClick={() => editAlert(alert)}
                            title="Edit alert settings"
                          >
                            <Edit className="size-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-9 p-0 text-red-500 hover:text-red-600"
                            onClick={() => deleteAlert(alert.id)}
                            title="Delete alert"
                          >
                            <Trash2 className="size-4" />
                          </Button>
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

        {showWalletModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Connect Wallet</CardTitle>
                <p className="text-sm text-muted-foreground">Choose your preferred Solana wallet</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Phantom", id: "phantom", icon: "👻" },
                  { name: "Solflare", id: "solflare", icon: "🔥" },
                  { name: "Backpack", id: "backpack", icon: "🎒" },
                  { name: "Glow", id: "glow", icon: "✨" },
                ].map((wallet) => (
                  <Button
                    key={wallet.id}
                    variant="outline"
                    className="w-full justify-start h-12 bg-transparent"
                    onClick={() => handleConnectWallet(wallet.id)}
                    disabled={isLoading}
                  >
                    <span className="text-lg mr-3">{wallet.icon}</span>
                    {wallet.name}
                    {isLoading && <Loader2 className="ml-2 size-4 animate-spin" />}
                  </Button>
                ))}
                <Button variant="ghost" className="w-full mt-4" onClick={() => setShowWalletModal(false)}>
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Settings</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                  <X className="size-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Phone Number</h4>
                  {isPhoneVerified ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="size-4 text-green-500" />
                        <span>Verified: {phoneNumber}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={changePhoneNumber} className="w-full bg-transparent">
                        Change Phone Number
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No phone number verified. Enable SMS alerts to add your phone number.
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">Wallet</h4>
                  <div className="text-sm text-muted-foreground">
                    Connected:{" "}
                    {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}` : "Not connected"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingAlert && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="size-4 text-green-500" />
                        <span className="text-sm">SMS Alerts</span>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Phone className="size-4 text-red-500" />
                        <span className="text-sm">Phone Calls</span>
                      </div>
                      <Switch />
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
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Alert Metrics Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-4 rounded-lg border space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={alert.status === "active" ? "default" : "secondary"}>{alert.status}</Badge>
                          <span className="font-semibold text-lg">{alert.ticker}</span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => editAlert(alert)}>
                          <Edit className="size-3 mr-1" />
                          Edit
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 rounded border">
                          <div className="font-medium mb-2 flex items-center gap-2">
                            Market Cap
                            <Badge
                              variant={alert.metrics?.marketCapEnabled ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {alert.metrics?.marketCapEnabled ? "ON" : "OFF"}
                            </Badge>
                          </div>
                          {alert.metrics?.marketCapEnabled && (
                            <div className="text-muted-foreground">
                              <div>High: ${alert.metrics?.marketCapHigh?.toLocaleString()}</div>
                              <div>Low: ${alert.metrics?.marketCapLow?.toLocaleString()}</div>
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded border">
                          <div className="font-medium mb-2 flex items-center gap-2">
                            Price Change
                            <Badge
                              variant={alert.metrics?.priceChangeEnabled ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {alert.metrics?.priceChangeEnabled ? "ON" : "OFF"}
                            </Badge>
                          </div>
                          {alert.metrics?.priceChangeEnabled && (
                            <div className="text-muted-foreground">±{alert.metrics?.priceChangeThreshold}%</div>
                          )}
                        </div>

                        <div className="p-3 rounded border">
                          <div className="font-medium mb-2 flex items-center gap-2">
                            Volume
                            <Badge variant={alert.metrics?.volumeEnabled ? "default" : "secondary"} className="text-xs">
                              {alert.metrics?.volumeEnabled ? "ON" : "OFF"}
                            </Badge>
                          </div>
                          {alert.metrics?.volumeEnabled && (
                            <div className="text-muted-foreground">
                              <div>${alert.metrics?.volumeThreshold?.toLocaleString()}</div>
                              <div>{alert.metrics?.volumePeriod}</div>
                            </div>
                          )}
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
      </main>
    </div>
  )
}
