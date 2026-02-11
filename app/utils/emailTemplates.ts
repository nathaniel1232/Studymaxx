/**
 * Email Templates for StudyMaxx
 * Simple HTML templates for transactional emails
 */

export const emailTemplates = {
  /**
   * Streak Reminder Email - sent when user is about to lose their streak
   */
  streakReminder: (userName: string, streakDays: number, setName: string) => ({
    subject: `Don't break your ${streakDays}-day streak! 🔥`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Streak Reminder</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <h1 style="margin: 0; font-size: 32px; color: #1a1a1a;">🔥 Don't Break Your Streak!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <p style="font-size: 16px; line-height: 24px; color: #4a4a4a; margin: 0 0 20px 0;">
                        Hi${userName ? ` ${userName}` : ''},
                      </p>
                      
                      <p style="font-size: 16px; line-height: 24px; color: #4a4a4a; margin: 0 0 20px 0;">
                        You're on a <strong>${streakDays}-day study streak</strong> with your set "<strong>${setName}</strong>"! 
                        ${streakDays >= 7 ? 'That\'s incredible consistency! 🌟' : ''}
                      </p>
                      
                      <p style="font-size: 16px; line-height: 24px; color: #4a4a4a; margin: 0 0 30px 0;">
                        You haven't studied today yet. Don't let your hard work go to waste — review your flashcards now to keep your streak alive! 💪
                      </p>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://www.studymaxx.net/study" 
                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                          Continue Your Streak →
                        </a>
                      </div>
                      
                      <p style="font-size: 14px; line-height: 20px; color: #6b6b6b; margin: 30px 0 0 0; text-align: center;">
                        Studies show that daily review is the key to long-term retention. Keep it up! 📚
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f8f8f8; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #e5e5e5;">
                      <p style="font-size: 12px; line-height: 18px; color: #999999; margin: 0;">
                        StudyMaxx - AI-Powered Study Tools<br>
                        <a href="https://www.studymaxx.net" style="color: #667eea; text-decoration: none;">studymaxx.net</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }),

  /**
   * Welcome Email - sent when user signs up
   */
  welcome: (userName: string) => ({
    subject: 'Welcome to StudyMaxx! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to StudyMaxx</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <h1 style="margin: 0; font-size: 32px; color: #1a1a1a;">Welcome to StudyMaxx! 🎉</h1>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <p style="font-size: 16px; line-height: 24px; color: #4a4a4a; margin: 0 0 20px 0;">
                        Hi${userName ? ` ${userName}` : ''},
                      </p>
                      
                      <p style="font-size: 16px; line-height: 24px; color: #4a4a4a; margin: 0 0 20px 0;">
                        Thanks for joining StudyMaxx! Your AI-powered study companion is ready to help you ace your exams. 📚✨
                      </p>
                      
                      <h3 style="font-size: 18px; color: #1a1a1a; margin: 30px 0 15px 0;">What you can do:</h3>
                      <ul style="font-size: 16px; line-height: 28px; color: #4a4a4a; margin: 0 0 30px 0; padding-left: 20px;">
                        <li>Generate flashcards from notes, PDFs, and YouTube videos</li>
                        <li>Test yourself with interactive quizzes</li>
                        <li>Track your progress with study streaks</li>
                        <li>Study anywhere with automatic cloud sync</li>
                      </ul>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://www.studymaxx.net/dashboard" 
                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          Get Started →
                        </a>
                      </div>
                      
                      <p style="font-size: 14px; line-height: 20px; color: #6b6b6b; margin: 30px 0 0 0; text-align: center;">
                        Need help getting started? Check out our <a href="https://www.studymaxx.net/tips" style="color: #667eea; text-decoration: none;">study tips</a>.
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f8f8f8; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #e5e5e5;">
                      <p style="font-size: 12px; line-height: 18px; color: #999999; margin: 0;">
                        StudyMaxx - AI-Powered Study Tools<br>
                        <a href="https://www.studymaxx.net" style="color: #667eea; text-decoration: none;">studymaxx.net</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }),

  /**
   * Premium Welcome Email - sent when user subscribes to premium
   */
  premiumWelcome: (userName: string) => ({
    subject: 'Welcome to StudyMaxx Premium! 🌟',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Premium</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <h1 style="margin: 0; font-size: 32px; color: #1a1a1a;">Welcome to Premium! 🌟</h1>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <p style="font-size: 16px; line-height: 24px; color: #4a4a4a; margin: 0 0 20px 0;">
                        Hi${userName ? ` ${userName}` : ''},
                      </p>
                      
                      <p style="font-size: 16px; line-height: 24px; color: #4a4a4a; margin: 0 0 20px 0;">
                        Thank you for upgrading to StudyMaxx Premium! You now have access to all premium features. 🚀
                      </p>
                      
                      <h3 style="font-size: 18px; color: #1a1a1a; margin: 30px 0 15px 0;">Your Premium Benefits:</h3>
                      <ul style="font-size: 16px; line-height: 28px; color: #4a4a4a; margin: 0 0 30px 0; padding-left: 20px;">
                        <li>🔄 <strong>Unlimited study sets</strong> - no daily limits</li>
                        <li>🎯 <strong>50 flashcards per set</strong> - more content, better retention</li>
                        <li>⚙️ <strong>Custom difficulty levels</strong> - Easy, Medium, Hard</li>
                        <li>🌍 <strong>17 languages</strong> - study in any language</li>
                        <li>🎮 <strong>Matching games</strong> - additional study modes</li>
                        <li>📁 <strong>Folders</strong> - organize your study sets</li>
                      </ul>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="https://www.studymaxx.net/dashboard" 
                           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                          Start Creating →
                        </a>
                      </div>
                      
                      <p style="font-size: 14px; line-height: 20px; color: #6b6b6b; margin: 30px 0 0 0; text-align: center;">
                        You can manage your subscription anytime from your <a href="https://www.studymaxx.net/settings" style="color: #667eea; text-decoration: none;">settings</a>.
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f8f8f8; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #e5e5e5;">
                      <p style="font-size: 12px; line-height: 18px; color: #999999; margin: 0;">
                        StudyMaxx - AI-Powered Study Tools<br>
                        <a href="https://www.studymaxx.net" style="color: #667eea; text-decoration: none;">studymaxx.net</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }),
};
