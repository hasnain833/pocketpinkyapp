import axios from 'axios';

const COLORS = {
    cream: "#FFFCF9",
    charcoal: "#2D2A27",
    pink: "#D4737A",
    wine: "#8B3A4C",
    gold: "#C9A55C",
    divider: "#EDE8E3",
    textMuted: "#9B9590",
};

const SENDGRID_API_KEY = process.env.EXPO_PUBLIC_SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.EXPO_PUBLIC_SENDGRID_FROM_EMAIL;
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';
const LOGO_URL = 'https://skqnatchmwomhyabeiim.supabase.co/storage/v1/object/public/public_assets/pinky.png';

const emailWrapper = (content: string) => `
    <div style="background-color: ${COLORS.cream}; padding: 40px 20px; font-family: 'Montserrat', Helvetica, Arial, sans-serif; color: ${COLORS.charcoal}; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid ${COLORS.divider}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="padding: 40px; text-align: center; border-bottom: 1px solid ${COLORS.divider};">
                <img src="${LOGO_URL}" alt="Pinky Pill" style="width: 80px; height: auto; margin-bottom: 20px;" />
                <h1 style="font-family: Georgia, serif; font-size: 28px; margin: 0; letter-spacing: 2px; text-transform: uppercase;">Pinky Pill</h1>
                <p style="font-size: 10px; color: ${COLORS.pink}; margin-top: 5px; letter-spacing: 1px; font-weight: bold;">YOUR AI BIG SISTER FOR DATING CLARITY</p>
            </div>
            <div style="padding: 40px;">
                ${content}
            </div>
            <div style="padding: 30px; background-color: #fafafa; border-top: 1px solid ${COLORS.divider}; text-align: center;">
                <p style="font-size: 11px; color: ${COLORS.textMuted}; margin: 0;">
                    &copy; ${new Date().getFullYear()} Pinky Pill. All rights reserved.
                </p>
                <p style="font-size: 10px; color: ${COLORS.textMuted}; margin-top: 10px;">
                    Stay sharp. Trust Pinky.
                </p>
            </div>
        </div>
    </div>
`;

export const emailService = {
    async sendPasswordResetEmail(toEmail: string, confirmLink: string) {
        const htmlContent = emailWrapper(`
            <h2 style="font-family: Georgia, serif; font-size: 24px; color: ${COLORS.charcoal}; margin-top: 0;">Access Request</h2>
            <p style="font-size: 15px; color: #4a4a4a; margin-bottom: 25px;">
                We received a request to reset your password. If you didn't initiate this, you can safely ignore this email.
            </p>
            <div style="text-align: center; margin: 35px 0;">
                <a href="${confirmLink}" style="display: inline-block; background-color: ${COLORS.charcoal}; color: ${COLORS.cream}; padding: 18px 36px; text-decoration: none; border-radius: 2px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s;">
                    Reset Password
                </a>
            </div>
            <p style="font-size: 13px; color: ${COLORS.textMuted}; text-align: center;">
                If the button above doesn't work, copy and paste this link:<br/>
                <a href="${confirmLink}" style="color: ${COLORS.pink}; word-break: break-all; text-decoration: none;">${confirmLink}</a>
            </p>
        `);

        return this.sendEmail(toEmail, "Reset your password | Pinky Pill", htmlContent);
    },

    async sendEmail(toEmail: string, subject: string, htmlContent: string) {
        try {
            await axios.post(
                SENDGRID_API_URL,
                {
                    personalizations: [{ to: [{ email: toEmail }] }],
                    from: { email: SENDGRID_FROM_EMAIL, name: 'Pinky Pill' },
                    subject: subject,
                    content: [{ type: 'text/html', value: htmlContent }],
                },
                {
                    headers: {
                        Authorization: `Bearer ${SENDGRID_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            return { success: true };
        } catch (error: any) {
            console.error('SendGrid Error:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    },
};
