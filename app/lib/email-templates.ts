/**
 * Email Templates for StudyMaxx
 * Beautiful, professional email designs
 */

export function getVerificationEmailTemplate(verificationLink: string, userName: string = "there"): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .code { background: white; padding: 15px; border: 1px solid #e5e7eb; border-radius: 6px; font-family: monospace; text-align: center; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✉️ Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Hi ${userName}! 👋</p>
            <p>Welcome to <strong>StudyMaxx</strong>! We're excited to have you on board.</p>
            <p>To get started, please verify your email address by clicking the button below:</p>
            
            <center>
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </center>

            <p style="text-align: center; color: #999; font-size: 13px;">
              Or copy and paste this link:<br>
              <small style="word-break: break-all;">${verificationLink}</small>
            </p>

            <p>This link will expire in 24 hours.</p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

            <p style="font-size: 12px; color: #666;">
              If you didn't sign up for StudyMaxx, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 StudyMaxx. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getPasswordResetTemplate(resetLink: string, userName: string = "there"): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f97316; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background: #fef2f2; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi ${userName}! 👋</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <center>
              <a href="${resetLink}" class="button">Reset Password</a>
            </center>

            <p style="text-align: center; color: #999; font-size: 13px;">
              Or copy and paste this link:<br>
              <small style="word-break: break-all;">${resetLink}</small>
            </p>

            <div class="warning">
              <strong>⚠️ Security Note:</strong> This link will expire in 24 hours. If you didn't request a password reset, please ignore this email and your account will remain secure.
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

            <p style="font-size: 12px; color: #666;">
              If you have any questions, contact our support team.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 StudyMaxx. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getWelcomeTemplate(userName: string = "Student"): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; font-size: 12px; }
          .feature-box { background: #f0f9ff; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .features-grid { display: grid; gap: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to StudyMaxx!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName}! 🚀</p>
            <p>You're now part of thousands of students using StudyMaxx to study smarter, not harder.</p>

            <h3>Here's what you can do right now:</h3>
            <div class="features-grid">
              <div class="feature-box">
                <strong>📸 Upload Homework</strong><br>
                Take a photo or upload a PDF - AI explains instantly
              </div>
              <div class="feature-box">
                <strong>📝 Create Flashcards</strong><br>
                Auto-generate flashcards from your notes to ace exams
              </div>
              <div class="feature-box">
                <strong>🌍 Multi-Language Support</strong><br>
                StudyMaxx detects and explains in Finnish, German, Spanish, English & more
              </div>
              <div class="feature-box">
                <strong>⚡ Instant AI Tutoring</strong><br>
                Get personalized explanations tailored to your learning style
              </div>
            </div>

            <center>
              <a href="https://www.studymaxx.net/dashboard" class="button">Start Studying Now</a>
            </center>

            <h3>Pro Tips:</h3>
            <ul>
              <li>✅ Start with uploading a recent homework problem</li>
              <li>✅ Check out the tips section for study hacks</li>
              <li>✅ Upgrade to Premium for unlimited features</li>
            </ul>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

            <p>Questions? Our team is here to help. Just reply to this email!</p>
            <p>Happy studying! 🎓</p>
          </div>
          <div class="footer">
            <p>© 2026 StudyMaxx. Helping students learn smarter.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getPracticeReminderTemplate(userName: string = "Student"): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f0fdf4; padding: 30px; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; font-size: 12px; }
          .stat-box { background: white; border: 2px solid #10b981; padding: 15px; margin: 15px 0; border-radius: 6px; text-align: center; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .motivation { background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Time to Level Up!</h1>
          </div>
          <div class="content">
            <p>Hey ${userName}! 👋</p>
            <p>We've noticed you haven't practiced in a while. Remember: consistency is the key to mastery! 📚</p>

            <div class="stat-box">
              <h3>💪 Did you know?</h3>
              <p>Students who practice for just <strong>15 minutes daily</strong> improve their retention by <strong>90%</strong>!</p>
            </div>

            <h3>What have you been working on?</h3>
            <ul>
              <li>📸 Upload that homework problem you've been stuck on</li>
              <li>📝 Review your flashcards from last week</li>
              <li>🎯 Try a new study technique with StudyMaxx</li>
            </ul>

            <div class="motivation">
              <strong>✨ Quick Reminder:</strong> You've already invested time in creating your study materials. Just 10 more minutes can reinforce everything you've learned!
            </div>

            <center>
              <a href="https://www.studymaxx.net/dashboard" class="button">Continue Studying</a>
            </center>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

            <p style="font-size: 13px; color: #666;">
              <strong>Getting too many reminders?</strong> You can adjust your email preferences in Settings.
            </p>
          </div>
          <div class="footer">
            <p>Stay consistent, stay successful! 🚀</p>
            <p>© 2026 StudyMaxx</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getPremiumUpgradeTemplate(userName: string = "Student", lastFeature: string = "unlimited documents"): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #fefce8; padding: 30px; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; font-size: 12px; }
          .benefit { background: white; padding: 12px; margin: 10px 0; border-left: 3px solid #f59e0b; border-radius: 3px; }
          .price-box { background: white; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚡ Unlock Premium Power</h1>
          </div>
          <div class="content">
            <p>Hi ${userName}! 📱</p>
            <p>You just tried to use <strong>${lastFeature}</strong>, which is a Premium feature.</p>
            <p>We get it - our free plan has limits. But Premium unlocks everything:</p>

            <div>
              <div class="benefit">✅ <strong>Unlimited documents</strong> - Upload as much as you want</div>
              <div class="benefit">✅ <strong>Instant AI tutoring</strong> - Get answers in seconds</div>
              <div class="benefit">✅ <strong>Advanced flashcards</strong> - Smart study recommendations</div>
              <div class="benefit">✅ <strong>No ads, no limits</strong> - Pure focus on learning</div>
              <div class="benefit">✅ <strong>Priority support</strong> - We help within 24 hours</div>
            </div>

            <div class="price-box">
              <h3>Only $4.99/month</h3>
              <p style="color: #666; margin: 10px 0;">That's less than a coffee! ☕</p>
              <p style="font-size: 12px; color: #999;">Cancel anytime, no questions asked</p>
            </div>

            <center>
              <a href="https://www.studymaxx.net/pricing" class="button">Upgrade to Premium</a>
            </center>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

            <p style="font-size: 12px; color: #666;">
              Questions about Premium? <a href="https://www.studymaxx.net/help" style="color: #f59e0b;">Check our FAQ</a>
            </p>
          </div>
          <div class="footer">
            <p>Your success is our mission! 🎓</p>
            <p>© 2026 StudyMaxx</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
