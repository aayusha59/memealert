import twilio from 'twilio';

// Initialize Twilio client - we'll create this lazily to ensure environment variables are loaded
let client: any = null;

function getTwilioClient() {
  if (!client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ Cannot initialize Twilio client: Missing environment variables');
      console.error('TWILIO_ACCOUNT_SID exists:', !!process.env.TWILIO_ACCOUNT_SID);
      console.error('TWILIO_AUTH_TOKEN exists:', !!process.env.TWILIO_AUTH_TOKEN);
      throw new Error('Missing Twilio environment variables');
    }
    
    console.log('🔄 Initializing Twilio client...');
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    console.log('✅ Twilio client initialized');
  }
  return client;
}

/**
 * Send a verification code to a phone number
 * @param phoneNumber - Phone number in E.164 format (e.g. +15551234567)
 * @returns Promise with verification status
 */
export async function sendVerificationCode(phoneNumber: string): Promise<any> {
  try {
    console.log('📱 Creating Twilio verification for:', phoneNumber);
    
    // Check if environment variables are set
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.error('❌ TWILIO_ACCOUNT_SID environment variable is not set');
      throw new Error('TWILIO_ACCOUNT_SID environment variable is not set');
    }
    
    if (!process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ TWILIO_AUTH_TOKEN environment variable is not set');
      throw new Error('TWILIO_AUTH_TOKEN environment variable is not set');
    }
    
    if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
      console.error('❌ TWILIO_VERIFY_SERVICE_SID environment variable is not set');
      throw new Error('TWILIO_VERIFY_SERVICE_SID environment variable is not set');
    }
    
    console.log('🔑 Twilio environment check passed, all variables set');
    
    // Log partial values of environment variables for debugging
    if (process.env.TWILIO_ACCOUNT_SID) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      console.log('🔑 TWILIO_ACCOUNT_SID:', accountSid.substring(0, 4) + '...' + accountSid.substring(accountSid.length - 4));
    }
    
    if (process.env.TWILIO_VERIFY_SERVICE_SID) {
      const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
      console.log('🔑 TWILIO_VERIFY_SERVICE_SID:', serviceSid);
      
      // Check if the service SID looks valid
      if (!serviceSid.startsWith('VA')) {
        console.warn('⚠️ WARNING: TWILIO_VERIFY_SERVICE_SID does not start with "VA". This may not be a valid Verify service SID.');
      }
    }
    
    // Create verification
    console.log('📡 Calling Twilio API to create verification...');
    const twilioClient = getTwilioClient();
    const verification = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });
      
    console.log('✅ Twilio verification created successfully:', verification.status);
    return verification;
  } catch (error) {
    console.error('❌ Twilio sendVerificationCode error:', error);
    
    // Log more detailed error information
    if (error && typeof error === 'object') {
      if ('code' in error) {
        console.error('🔍 Twilio error code:', (error as any).code);
      }
      if ('message' in error) {
        console.error('🔍 Twilio error message:', (error as any).message);
      }
      if ('moreInfo' in error) {
        console.error('🔍 Twilio error more info:', (error as any).moreInfo);
      }
    }
    
    throw error;
  }
}

/**
 * Verify a code sent to a phone number
 * @param phoneNumber - Phone number in E.164 format (e.g. +15551234567)
 * @param code - Verification code
 * @returns Promise with verification check status
 */
export async function verifyCode(phoneNumber: string, code: string): Promise<any> {
  try {
    console.log('🔍 Checking Twilio verification code for:', phoneNumber);
    
    // Check if environment variables are set
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.error('❌ TWILIO_ACCOUNT_SID environment variable is not set');
      throw new Error('TWILIO_ACCOUNT_SID environment variable is not set');
    }
    
    if (!process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ TWILIO_AUTH_TOKEN environment variable is not set');
      throw new Error('TWILIO_AUTH_TOKEN environment variable is not set');
    }
    
    if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
      console.error('❌ TWILIO_VERIFY_SERVICE_SID environment variable is not set');
      throw new Error('TWILIO_VERIFY_SERVICE_SID environment variable is not set');
    }
    
    console.log('🔑 Twilio environment check passed, all variables set');
    
    // Log partial values of environment variables for debugging
    if (process.env.TWILIO_ACCOUNT_SID) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      console.log('🔑 TWILIO_ACCOUNT_SID:', accountSid.substring(0, 4) + '...' + accountSid.substring(accountSid.length - 4));
    }
    
    if (process.env.TWILIO_VERIFY_SERVICE_SID) {
      const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
      console.log('🔑 TWILIO_VERIFY_SERVICE_SID:', serviceSid);
      
      // Check if the service SID looks valid
      if (!serviceSid.startsWith('VA')) {
        console.warn('⚠️ WARNING: TWILIO_VERIFY_SERVICE_SID does not start with "VA". This may not be a valid Verify service SID.');
      }
    }
    
    console.log('📡 Calling Twilio API to verify code...');
    
    // Check verification code
    const twilioClient = getTwilioClient();
    const verificationCheck = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phoneNumber,
        code: code,
      });
      
    console.log('✅ Twilio verification check result:', verificationCheck.status);
    return verificationCheck;
  } catch (error) {
    console.error('❌ Twilio verifyCode error:', error);
    
    // Log more detailed error information
    if (error && typeof error === 'object') {
      if ('code' in error) {
        console.error('🔍 Twilio error code:', (error as any).code);
      }
      if ('message' in error) {
        console.error('🔍 Twilio error message:', (error as any).message);
      }
      if ('moreInfo' in error) {
        console.error('🔍 Twilio error more info:', (error as any).moreInfo);
      }
    }
    
    throw error;
  }
}
