"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function DatabaseTest() {
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testConnection = async () => {
    setIsLoading(true)
    setTestResult('Testing...')
    
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (error) {
        setTestResult(`❌ Connection failed: ${error.message}`)
        console.error('Database test error:', error)
      } else {
        setTestResult('✅ Database connection successful!')
        console.log('Database test result:', data)
      }
    } catch (err) {
      setTestResult(`❌ Test failed: ${err}`)
      console.error('Test error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const testUserCreation = async () => {
    setIsLoading(true)
    setTestResult('Creating test user...')
    
    try {
      const testWallet = 'test_wallet_' + Date.now()
      const { data, error } = await supabase
        .from('users')
        .insert([{ 
          wallet_address: testWallet,
          phone_verified: false  // Explicitly set default values for new phone fields
        }])
        .select('id, wallet_address, phone_verified')
        .single()
      
      if (error) {
        setTestResult(`❌ User creation failed: ${error.message}`)
        console.error('User creation error:', error)
      } else {
        setTestResult(`✅ Test user created with ID: ${data.id} (phone_verified: ${data.phone_verified})`)
        console.log('User creation result:', data)
      }
    } catch (err) {
      setTestResult(`❌ User creation test failed: ${err}`)
      console.error('User creation test error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const testAlertCreation = async () => {
    setIsLoading(true)
    setTestResult('Creating test alert...')
    
    try {
      // First create a test user
      const testWallet = 'test_wallet_' + Date.now()
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{ 
          wallet_address: testWallet,
          phone_verified: false
        }])
        .select('id')
        .single()
      
      if (userError) {
        setTestResult(`❌ User creation failed: ${userError.message}`)
        return
      }

      // Then try to create an alert
      const { data: alertData, error: alertError } = await supabase
        .from('alerts')
        .insert([{
          user_id: userData.id,
          token_address: 'test_token_' + Date.now(),
          token_symbol: 'TEST',
          token_name: 'Test Token',
          status: 'active',
          notifications_enabled: true
        }])
        .select('id')
        .single()
      
      if (alertError) {
        setTestResult(`❌ Alert creation failed: ${alertError.message}`)
        console.error('Alert creation error:', alertError)
      } else {
        setTestResult(`✅ Test alert created with ID: ${alertData.id}`)
        console.log('Alert creation result:', alertData)
      }
    } catch (err) {
      setTestResult(`❌ Alert creation test failed: ${err}`)
      console.error('Alert creation test error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const clearAllData = async () => {
    setIsLoading(true)
    setTestResult('Clearing all data...')
    
    try {
      // Clear in reverse order due to foreign key constraints
      const { error: historyError } = await supabase
        .from('notification_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows
        
      const { error: settingsError } = await supabase
        .from('notification_settings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        

        
      const { error: metricsError } = await supabase
        .from('alert_metrics')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        
      const { error: alertsError } = await supabase
        .from('alerts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        
      const { error: usersError } = await supabase
        .from('users')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (historyError || settingsError || metricsError || alertsError || usersError) {
        setTestResult('❌ Some tables failed to clear. Check console for details.')
        console.error('Clear errors:', { historyError, settingsError, metricsError, alertsError, usersError })
      } else {
        setTestResult('✅ All data cleared successfully!')
      }
    } catch (err) {
      setTestResult(`❌ Clear failed: ${err}`)
      console.error('Clear error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/20">
      <h3 className="text-lg font-semibold mb-4">Database Connection Test</h3>
      <div className="space-y-2">
        <button
          onClick={testConnection}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Test Connection
        </button>
        <button
          onClick={testUserCreation}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 ml-2"
        >
          Test User Creation
        </button>
        <button
          onClick={testAlertCreation}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50 ml-2"
        >
          Test Alert Creation
        </button>
        <button
          onClick={clearAllData}
          disabled={isLoading}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50 ml-2"
        >
          Clear All Data
        </button>
      </div>
      <div className="mt-4 p-2 bg-background rounded border">
        <p className="text-sm">{testResult}</p>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not Set'}</p>
        <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not Set'}</p>
      </div>
    </div>
  )
}
