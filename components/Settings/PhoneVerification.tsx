"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Phone, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useWallet } from "@/contexts/WalletContext"

// Animation variants
const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
      duration: 0.3
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
      duration: 0.2
    }
  }
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2, ease: "easeInOut" }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" }
  }
}

// Phone verification component for settings

export function PhoneVerification() {
  const { 
    walletAddress, 
    userId, 
    phoneNumber: contextPhoneNumber, 
    phoneVerified: contextPhoneVerified, 
    phoneVerifiedAt: contextPhoneVerifiedAt,
    refreshPhoneStatus
  } = useWallet()
  
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)

  // Use context phone status
  const phoneStatus = {
    phoneNumber: contextPhoneNumber,
    phoneVerified: contextPhoneVerified,
    phoneVerifiedAt: contextPhoneVerifiedAt
  }

  // Sync local phone number with context
  useEffect(() => {
    if (contextPhoneNumber) {
      setPhoneNumber(contextPhoneNumber)
    }
  }, [contextPhoneNumber])

  const formatPhoneNumber = (phone: string) => {
    // Simple formatting for display
    if (phone.startsWith('+1') && phone.length === 12) {
      const digits = phone.slice(2)
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
    return phone
  }

  const validatePhoneNumber = (phone: string) => {
    // Basic international phone number validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    return phoneRegex.test(phone)
  }

  const sendVerificationCode = async () => {
    if (!walletAddress) {
      toast.error("Wallet not connected")
      return
    }

    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number")
      return
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast.error("Please enter a valid international phone number (e.g., +1234567890)")
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          phoneNumber
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code')
      }

      toast.success("Verification code sent!")
      setShowVerificationModal(true)
      setVerificationCode("")
    } catch (error) {
      console.error("Error sending verification code:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send verification code")
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async () => {
    if (!walletAddress) {
      toast.error("Wallet not connected")
      return
    }

    if (verificationCode.length !== 6) {
      toast.error("Please enter the complete 6-digit code")
      return
    }

    setIsVerifying(true)

    try {
      console.log('🔍 Verifying code:', verificationCode, 'for wallet:', walletAddress)
      
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          verificationCode
        })
      })

      const data = await response.json()
      console.log('📝 Verification response:', data, 'Status:', response.status)

      if (!response.ok) {
        console.error('❌ Verification failed:', data)
        throw new Error(data.error || 'Failed to verify code')
      }

      toast.success("Phone number verified successfully!")
      
      // Refresh phone status from context
      await refreshPhoneStatus()

      setShowVerificationModal(false)
      setVerificationCode("")
    } catch (error) {
      console.error("Error verifying code:", error)
      toast.error(error instanceof Error ? error.message : "Failed to verify code")
    } finally {
      setIsVerifying(false)
    }
  }

  const startNewVerification = () => {
    setPhoneNumber("")
    // Note: In a full implementation, you might want to clear the phone number from the database
    // For now, we just reset the local form state
  }

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="size-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md">
            <Phone className="size-4" />
          </div>
          <h4 className="text-xl font-semibold">Phone Verification</h4>
        </div>

        {phoneStatus.phoneVerified && phoneStatus.phoneNumber ? (
          // Already verified
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="size-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="size-4 text-green-600 dark:text-green-400" />
              </div>
              <Badge variant="default" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800">
                Verified
              </Badge>
            </div>
            
            <div className="p-4 bg-muted/40 backdrop-blur-sm rounded-lg border border-border/20">
              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Verified Phone Number</Label>
              <div className="font-mono text-foreground text-lg">{formatPhoneNumber(phoneStatus.phoneNumber)}</div>
              {phoneStatus.phoneVerifiedAt && (
                <div className="text-sm text-muted-foreground mt-2">
                  Verified on {new Date(phoneStatus.phoneVerifiedAt).toLocaleDateString()}
                </div>
              )}
            </div>

            <Button 
              variant="outline" 
              onClick={startNewVerification} 
              className="w-full rounded-lg bg-background/50 hover:bg-background/80 border-border/40 transition-all duration-200"
            >
              Change Phone Number
            </Button>
          </div>
        ) : (
          // Not verified yet
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="size-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertCircle className="size-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
                Not Verified
              </Badge>
            </div>

            <div className="space-y-3">
              <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="font-mono bg-background/50 border-border/40 rounded-lg h-12 text-base"
              />
              <p className="text-xs text-muted-foreground">
                Enter your phone number in international format (e.g., +1 for US)
              </p>
            </div>

            <Button 
              onClick={sendVerificationCode} 
              disabled={isLoading || !phoneNumber.trim()}
              className="w-full h-12 rounded-lg text-base font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Sending Code...
                </>
              ) : (
                "Send Verification Code"
              )}
            </Button>

            <div className="text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg border border-border/20">
              <p>
                You'll receive a 6-digit verification code via SMS. 
                Standard messaging rates may apply.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Verification Code Modal */}
      <AnimatePresence>
        {showVerificationModal && (
          <Dialog open={true} onOpenChange={setShowVerificationModal}>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              onClick={() => setShowVerificationModal(false)}
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
                <DialogContent className="sm:max-w-md bg-gradient-to-b from-background to-muted/10 border border-border/40 rounded-xl shadow-2xl backdrop-blur-md">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="size-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                <Phone className="size-6" />
              </div>
            </div>
            <DialogTitle className="text-xl font-semibold">Enter Verification Code</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center p-4 bg-muted/20 rounded-lg border border-border/20">
              <p className="text-sm text-muted-foreground mb-2">
                We sent a 6-digit code to:
              </p>
              <p className="font-mono font-medium text-lg">
                {formatPhoneNumber(phoneNumber)}
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP 
                maxLength={6} 
                value={verificationCode} 
                onChange={setVerificationCode}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="size-12 text-lg border-border/40" />
                  <InputOTPSlot index={1} className="size-12 text-lg border-border/40" />
                  <InputOTPSlot index={2} className="size-12 text-lg border-border/40" />
                  <InputOTPSlot index={3} className="size-12 text-lg border-border/40" />
                  <InputOTPSlot index={4} className="size-12 text-lg border-border/40" />
                  <InputOTPSlot index={5} className="size-12 text-lg border-border/40" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={verifyCode} 
                disabled={isVerifying || verificationCode.length !== 6}
                className="w-full h-12 rounded-lg text-base font-medium"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>

              <Button 
                variant="outline" 
                onClick={sendVerificationCode}
                disabled={isLoading}
                className="w-full h-12 rounded-lg bg-background/50 hover:bg-background/80 border-border/40 transition-all duration-200"
              >
                {isLoading ? "Sending..." : "Resend Code"}
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg border border-border/20">
              <p>Code expires in 10 minutes</p>
            </div>
          </div>
        </DialogContent>
              </motion.div>
            </motion.div>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  )
}
