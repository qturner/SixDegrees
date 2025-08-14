import nodemailer from 'nodemailer';
import type { ContactSubmission } from '@shared/schema';

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailUser = process.env.GMAIL_USER;
    const emailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!emailUser || !emailPassword) {
      console.warn('Gmail credentials not provided - email notifications disabled');
      console.log('GMAIL_USER:', emailUser ? 'provided' : 'missing');
      console.log('GMAIL_APP_PASSWORD:', emailPassword ? 'provided' : 'missing');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    console.log('Email service initialized with Gmail SMTP');
  }

  async sendContactNotification(submission: ContactSubmission): Promise<boolean> {
    if (!this.transporter) {
      console.log('Email service not configured - skipping notification');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER, // Send to yourself
        subject: `New Contact Form Submission - Six Degrees Game`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
              New Contact Form Submission
            </h2>
            
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Name:</strong> ${submission.name}</p>
              <p><strong>Email:</strong> ${submission.email}</p>
              <p><strong>Submitted:</strong> ${new Date(submission.createdAt!).toLocaleString()}</p>
            </div>
            
            <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #374151;">Message:</h3>
              <p style="line-height: 1.6; white-space: pre-wrap;">${submission.message}</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p>You can reply directly to this email to respond to ${submission.name}.</p>
              <p>Submission ID: ${submission.id}</p>
            </div>
          </div>
        `,
        replyTo: submission.email, // Allow easy reply to the user
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Contact notification sent for submission: ${submission.id}`);
      return true;
    } catch (error) {
      console.error('Failed to send contact notification:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.log('No transporter available for testing');
      return false;
    }

    try {
      console.log('Testing Gmail SMTP connection...');
      await this.transporter.verify();
      console.log('✅ Email service connection verified successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Email service connection failed:');
      console.error('Error code:', error.code);
      console.error('Response:', error.response);
      
      if (error.code === 'EAUTH') {
        console.error('\n🔧 Gmail Authentication Fix Required:');
        console.error('1. Go to https://myaccount.google.com');
        console.error('2. Navigate to Security → 2-Step Verification (enable if not active)');
        console.error('3. Go to Security → App passwords');
        console.error('4. Generate new app password for "Mail"');
        console.error('5. Update GMAIL_APP_PASSWORD secret with the 16-character code');
        console.error('6. Ensure GMAIL_USER is your full Gmail address');
      }
      
      return false;
    }
  }
}

export const emailService = new EmailService();