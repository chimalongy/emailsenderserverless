import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, app_password, sender_name } = body

    // Validate required fields
    if (!email || !app_password) {
      return NextResponse.json(
        { success: false, message: 'Email and app password are required' },
        { status: 400 }
      )
    }

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: app_password
      }
    })

    // Send test email to the email itself
    const testSubject = 'Test Email - Email Account Verification'
    const testBody = `This is a test email to verify that your app password is working correctly.

If you received this email, your email account has been successfully configured and can send emails through our system.

Sender Name: ${sender_name || 'Not set'}
Email: ${email}

You can now proceed to use this email account for sending emails.`

    const mailOptions = {
      from: `"${sender_name || email}" <${email}>`,
      to: email,
      subject: testSubject,
      text: testBody,
      html: testBody.replace(/\n/g, '<br>')
    }

    // Attempt to send the test email
    const info = await transporter.sendMail(mailOptions)

    // If we get here, the email was sent successfully
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId
    })

  } catch (error) {
    console.error('Error sending test email:', error)
    
    // Provide user-friendly error messages
    let errorMessage = 'Could not send test email'
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Invalid email or app password. Please check your credentials.'
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection error. Please check your internet connection and try again.'
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    )
  }
}

