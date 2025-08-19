"use client"

import { useState, useEffect } from "react"
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="size-5" />
            Phone Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {phoneStatus.phoneVerified && phoneStatus.phoneNumber ? (
            // Already verified
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-5 text-green-500" />
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Verified
                </Badge>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Verified Phone Number</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <div className="font-mono">{formatPhoneNumber(phoneStatus.phoneNumber)}</div>
                  {phoneStatus.phoneVerifiedAt && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Verified on {new Date(phoneStatus.phoneVerifiedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" onClick={startNewVerification} className="w-full">
                  Change Phone Number
                </Button>
              </div>
            </div>
          ) : (
            // Not verified yet
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-5 text-yellow-500" />
                <Badge variant="secondary">
                  Not Verified
                </Badge>
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <div className="mt-1">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your phone number in international format (e.g., +1 for US)
                  </p>
                </div>
              </div>

              <Button 
                onClick={sendVerificationCode} 
                disabled={isLoading || !phoneNumber.trim()}
                className="w-full"
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

              <div className="text-sm text-muted-foreground">
                <p>
                  You'll receive a 6-digit verification code via SMS. 
                  Standard messaging rates may apply.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Code Modal */}
      <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Verification Code</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to:
              </p>
              <p className="font-mono font-medium mt-1">
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
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={verifyCode} 
                disabled={isVerifying || verificationCode.length !== 6}
                className="w-full"
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
                className="w-full"
              >
                {isLoading ? "Sending..." : "Resend Code"}
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              <p>Code expires in 10 minutes</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
