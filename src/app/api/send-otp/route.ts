import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const { RESEND_API_KEY, EMAIL_USER } = process.env;

    if (!RESEND_API_KEY) {
      // Fallback for local testing if no key is present
      console.warn("No RESEND_API_KEY found. Falling back to UI display.");
      return NextResponse.json({ 
        success: true, 
        message: "API Key missing. OTP displayed on screen.",
        fallbackOtp: otp
      });
    }

    const resend = new Resend(RESEND_API_KEY);

    // Resend requires verified domains to send from custom emails.
    // If you don't have a verified domain, you MUST send from 'onboarding@resend.dev'
    const fromEmail = 'onboarding@resend.dev';

    const { data, error } = await resend.emails.send({
      from: `The Interview App <${fromEmail}>`,
      to: [email],
      subject: "Your Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #4f46e5; text-align: center;">The Interview App</h2>
          <p style="color: #334155; font-size: 16px;">Hello,</p>
          <p style="color: #334155; font-size: 16px;">You requested to reset your password. Use the OTP below to proceed.</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0f172a;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json({ 
        success: true, 
        message: "Email failed to send, but OTP displayed on screen.",
        fallbackOtp: otp
      });
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    console.error("Error in OTP route:", error);
    return NextResponse.json(
      { error: `Email failed: ${error.message || "Check server logs"}` },
      { status: 500 }
    );
  }
}
