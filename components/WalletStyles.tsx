"use client"

import { useEffect } from 'react'

export function WalletStyles() {
  useEffect(() => {
    // Import wallet adapter CSS only on client side
    try {
      require('@solana/wallet-adapter-react-ui/styles.css')
    } catch (error) {
      console.error('Failed to load wallet styles:', error)
    }
  }, [])

  return null
}
