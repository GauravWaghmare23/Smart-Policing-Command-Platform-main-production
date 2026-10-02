import { env } from '../config/env.js';

export const sendSMS = async (to, body) => {
  const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = env;
  
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log(`Twilio not configured; SMS skipped. Recipient: ${to}, Message: "${body}"`);
    return { success: true, status: 'SKIPPED' };
  }
  
  try {
    const authString = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`
      },
      body: new URLSearchParams({
        To: to,
        From: twilioPhoneNumber,
        Body: body
      })
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Twilio error: ${data.message || data.status}`);
    }
    
    console.log(`Twilio SMS sent successfully. Message SID: ${data.sid}`);
    return { success: true, status: 'SENT', sid: data.sid };
  } catch (error) {
    console.error(`Twilio SMS delivery failed: ${error.message}`);
    // Gratefully return success: false instead of blocking API flow
    return { success: false, status: 'FAILED', error: error.message };
  }
};
