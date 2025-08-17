"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react'
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { createUserIfNotExists, getUserByWalletAddress, getUserAlerts, saveUserAlerts, getPhoneVerification, getNotificationSettings } from '@/lib/supabase'
import { WalletStyles } from '@/components/WalletStyles'
import { ClientOnly } from '@/components/ClientOnly'

interface WalletContextType {
  walletAddress: string | null
  userId: string | null
  isWalletConnected: boolean
  isLoading: boolean
  alerts: any[]
  phoneNumber: string
  isPhoneVerified: boolean
  verificationStep: 'phone' | 'code' | 'verified'
  pushEnabled: boolean
  smsEnabled: boolean
  callsEnabled: boolean
  loadUserData: () => Promise<void>
  saveAlerts: (alerts: any[]) => Promise<void>
  setPhoneVerified: (verified: boolean, phoneNumber: string) => void
  setNotificationSettings: (settings: {
    pushEnabled: boolean
    smsEnabled: boolean
    callsEnabled: boolean
  }) => void
  handleDisconnect: () => void
  checkConnectionStatus: () => Promise<void>
  refreshUserData: () => Promise<void>
  reloadAlerts: () => Promise<void>
  updateAlertNotification: (alertId: string, notificationsEnabled: boolean) => Promise<void>
  updateAlertMetrics: (alertId: string, metrics: any) => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

// Inner component that uses the Solana wallet hooks
function WalletContextInner({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useSolanaWallet()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [alerts, setAlerts] = useState<any[]>([])
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [verificationStep, setVerificationStep] = useState<'phone' | 'code' | 'verified'>('phone')
  const [pushEnabled, setPushEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [callsEnabled, setCallsEnabled] = useState(false)

  // Check for saved wallet on mount and handle auto-reconnection
  useEffect(() => {
    const checkSavedWallet = async () => {
      const savedWallet = localStorage.getItem("connectedWallet")
      if (savedWallet) {
        try {
          console.log('🔄 Restoring wallet state from localStorage:', savedWallet)
          // Get user data for saved wallet
          const user = await getUserByWalletAddress(savedWallet)
          if (user) {
            setUserId(user.id)
            setWalletAddress(savedWallet)
            setIsWalletConnected(true)
            console.log('✅ User data restored from localStorage:', user.id)
            
            // Load alerts immediately
            const userAlerts = await getUserAlerts(user.id)
            console.log('🔔 Restored alerts from localStorage:', userAlerts?.length || 0, 'alerts')
            setAlerts(userAlerts || [])
            
            // Load other user data
            try {
              const phoneVerification = await getPhoneVerification(user.id)
              if (phoneVerification) {
                setPhoneNumber(phoneVerification.phone_number)
                setIsPhoneVerified(phoneVerification.is_verified)
                setVerificationStep(phoneVerification.is_verified ? 'verified' : 'phone')
              }
              
              const notificationSettings = await getNotificationSettings(user.id)
              setPushEnabled(notificationSettings.pushEnabled)
              setSmsEnabled(notificationSettings.smsEnabled)
              setCallsEnabled(notificationSettings.callsEnabled)
            } catch (error) {
              console.error("Error loading additional user data:", error)
            }
          } else {
            console.log('❌ No user found for saved wallet, clearing localStorage')
            localStorage.removeItem("connectedWallet")
          }
        } catch (error) {
          console.error("Error loading saved wallet data:", error)
          // Clear invalid localStorage data
          localStorage.removeItem("connectedWallet")
        }
      } else {
        console.log('ℹ️ No saved wallet found in localStorage')
      }
      setIsLoading(false)
    }
    
    checkSavedWallet()
  }, [])

  const loadUserData = useCallback(async () => {
    if (!userId) return
    
    setIsLoading(true)
    try {
      // Load alerts
      const userAlerts = await getUserAlerts(userId)
      setAlerts(userAlerts)
      
      // Load phone verification status
      const phoneVerification = await getPhoneVerification(userId)
      if (phoneVerification) {
        setPhoneNumber(phoneVerification.phone_number)
        setIsPhoneVerified(phoneVerification.is_verified)
        setVerificationStep(phoneVerification.is_verified ? 'verified' : 'phone')
      }
      
      // Load notification settings
      const notificationSettings = await getNotificationSettings(userId)
      setPushEnabled(notificationSettings.pushEnabled)
      setSmsEnabled(notificationSettings.smsEnabled)
      setCallsEnabled(notificationSettings.callsEnabled)
    } catch (error) {
      console.error("Error loading user data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const loadUserDataForAddress = useCallback(async (address: string) => {
    try {
      console.log('🔍 Loading user data for address:', address)
      // Create or get user in Supabase
      const user = await createUserIfNotExists(address)
      console.log('👤 User result:', user)
      if (user) {
        setUserId(user.id)
        console.log('✅ User ID set to:', user.id)
        await loadUserData()
      } else {
        console.error('❌ Failed to create/get user')
      }
    } catch (error) {
      console.error("Error loading user data for address:", error)
    }
  }, [loadUserData])

  // Simplified wallet connection handling
  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toString()
      console.log('🔗 Wallet connected:', address)
      
      // Only update if this is a new connection
      if (address !== walletAddress) {
        setWalletAddress(address)
        setIsWalletConnected(true)
        localStorage.setItem("connectedWallet", address)
        
        // Load user data for new connection
        loadUserDataForAddress(address)
      }
    }
  }, [connected, publicKey, walletAddress, loadUserDataForAddress])

  // Simplified loading state - only show loading during initial mount
  const isActuallyLoading = useMemo(() => {
    return isLoading
  }, [isLoading])

  // Add a function to manually check connection status
  const checkConnectionStatus = useCallback(async () => {
    const savedWallet = localStorage.getItem("connectedWallet")
    if (savedWallet && !connected) {
      // Try to restore connection
      try {
        const user = await getUserByWalletAddress(savedWallet)
        if (user) {
          setUserId(user.id)
          setWalletAddress(savedWallet)
          setIsWalletConnected(true) // Set as connected since we have valid data
          await loadUserData()
        }
      } catch (error) {
        console.error("Error restoring connection:", error)
      }
    }
  }, [connected, loadUserData])

  // Force refresh user data
  const refreshUserData = useCallback(async () => {
    if (userId) {
      console.log('🔄 Force refreshing user data for:', userId)
      await loadUserData()
    } else {
      console.log('🔄 No userId, checking for saved wallet...')
      const savedWallet = localStorage.getItem("connectedWallet")
      if (savedWallet) {
        try {
          const user = await getUserByWalletAddress(savedWallet)
          if (user) {
            setUserId(user.id)
            setWalletAddress(savedWallet)
            setIsWalletConnected(true)
            await loadUserData()
          }
        } catch (error) {
          console.error("Error refreshing user data:", error)
        }
      }
    }
  }, [userId, loadUserData])

  // Force reload alerts specifically
  const reloadAlerts = useCallback(async () => {
    if (userId) {
      console.log('🔄 Force reloading alerts for user:', userId)
      try {
        const userAlerts = await getUserAlerts(userId)
        console.log('🔔 Reloaded alerts:', userAlerts?.length || 0, 'alerts')
        setAlerts(userAlerts || [])
      } catch (error) {
        console.error("Error reloading alerts:", error)
      }
    }
  }, [userId])

  // Update specific alert notification status
  const updateAlertNotification = useCallback(async (alertId: string, notificationsEnabled: boolean) => {
    if (!userId) {
      console.error('❌ Cannot update alert notification: no userId')
      return
    }

    try {
      // Update in database
      const { updateAlertNotificationStatus } = await import('@/lib/supabase')
      await updateAlertNotificationStatus(alertId, notificationsEnabled)
      
      // Update local state
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, notificationsEnabled } 
            : alert
        )
      )
      
      console.log('✅ Alert notification status updated in context:', alertId, notificationsEnabled)
    } catch (error) {
      console.error("Error updating alert notification in context:", error)
      throw error
    }
  }, [userId])

  // Update specific alert metrics in context
  const updateAlertMetrics = useCallback(async (alertId: string, metrics: any) => {
    if (!userId) {
      console.error('❌ Cannot update alert metrics: no userId')
      return
    }

    try {
      // Update in database
      const { updateAlertMetrics: updateMetrics } = await import('@/lib/supabase')
      await updateMetrics(alertId, metrics)
      
      // Update local state
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, metrics } 
            : alert
        )
      )
      
      console.log('✅ Alert metrics updated in context:', alertId, metrics)
    } catch (error) {
      console.error("Error updating alert metrics in context:", error)
      throw error
    }
  }, [userId])

  const saveAlerts = useCallback(async (newAlerts: any[]) => {
    if (!userId) {
      console.error('❌ Cannot save alerts: no userId', { userId, newAlerts })
      return
    }
    
    console.log('💾 Saving alerts for user:', userId, 'Alerts:', newAlerts)
    try {
      await saveUserAlerts(userId, newAlerts)
      console.log('✅ Alerts saved successfully')
      setAlerts(newAlerts)
    } catch (error) {
      console.error("Error saving alerts:", error)
    }
  }, [userId])

  const setPhoneVerified = useCallback((verified: boolean, number: string) => {
    setIsPhoneVerified(verified)
    setPhoneNumber(number)
    setVerificationStep(verified ? 'verified' : 'phone')
  }, [])

  const setNotificationSettings = useCallback((settings: {
    pushEnabled: boolean
    smsEnabled: boolean
    callsEnabled: boolean
  }) => {
    setPushEnabled(settings.pushEnabled)
    setSmsEnabled(settings.smsEnabled)
    setCallsEnabled(settings.callsEnabled)
  }, [])

  // Handle wallet disconnection
  const handleDisconnect = useCallback(() => {
    localStorage.removeItem("connectedWallet")
    setWalletAddress(null)
    setUserId(null)
    setIsWalletConnected(false)
    setAlerts([])
    setPhoneNumber('')
    setIsPhoneVerified(false)
    setVerificationStep('phone')
    setPushEnabled(true)
    setSmsEnabled(false)
    setCallsEnabled(false)
  }, [])

  return (
    <WalletContext.Provider value={{
      walletAddress,
      userId,
      isWalletConnected,
      isLoading: isActuallyLoading,
      alerts,
      phoneNumber,
      isPhoneVerified,
      verificationStep,
      pushEnabled,
      smsEnabled,
      callsEnabled,
      loadUserData,
      saveAlerts,
      setPhoneVerified,
      setNotificationSettings,
      handleDisconnect,
      checkConnectionStatus,
      refreshUserData,
      reloadAlerts,
      updateAlertNotification,
      updateAlertMetrics
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function WalletProvider({ children }: { children: ReactNode }) {
  // Solana network configuration
  const network = WalletAdapterNetwork.Mainnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletStyles />
          <ClientOnly>
            <WalletContextInner>
              {children}
            </WalletContextInner>
          </ClientOnly>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
