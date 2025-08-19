"use client"

import React, { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet as useCustomWallet } from '@/contexts/WalletContext'
import { createUserIfNotExists } from '@/lib/supabase'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function WalletConnectButton() {
  const { publicKey, connected, disconnect } = useWallet()
  const { 
    walletAddress, 
    isWalletConnected, 
    userId, 
    loadUserData,
    isLoading,
    handleDisconnect: contextDisconnect
  } = useCustomWallet()
  
  const [isConnecting, setIsConnecting] = useState(false)

  // Handle wallet connection changes
  useEffect(() => {
    const handleWalletConnection = async () => {
      if (connected && publicKey) {
        setIsConnecting(true)
        try {
          const address = publicKey.toString()
          
          // Save to localStorage for persistence
          localStorage.setItem("connectedWallet", address)
          
          // Create or get user in Supabase
          const user = await createUserIfNotExists(address)
          if (user) {
            await loadUserData()
          }
        } catch (error) {
          console.error("Error handling wallet connection:", error)
        } finally {
          setIsConnecting(false)
        }
      }
      // Don't handle disconnection here - let the context handle it
    }

    handleWalletConnection()
  }, [connected, publicKey, loadUserData])

  // Handle wallet disconnection
  const handleDisconnect = () => {
    disconnect()
    contextDisconnect() // Use the context disconnect handler
  }

  return (
    <div className="flex items-center gap-4">
      {connected ? (
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
          </div>
          <button
            onClick={handleDisconnect}
            disabled={isConnecting || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? 'Connecting...' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Hidden WalletMultiButton for functionality */}
          <div className="absolute opacity-0 pointer-events-none">
            <WalletMultiButton />
          </div>
          {/* Custom styled button */}
          <Button 
            size="default" 
            className="rounded-full h-10 px-6 text-sm"
            onClick={() => {
              // Trigger the hidden WalletMultiButton
              const walletButton = document.querySelector('[data-testid="wallet-adapter-button"]') as HTMLElement;
              if (walletButton) {
                walletButton.click();
              }
            }}
            data-wallet-connect-button
          >
            Connect
          </Button>
        </div>
      )}
    </div>
  )
}
