import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const { EMAIL_USER, EMAIL_PASS } = process.env;

    if (!EMAIL_USER || !EMAIL_PASS) {
      return NextResponse.json(
        { error: "Email configuration is missing on the server. Please setup EMAIL_USER and EMAIL_PASS." },
        { status: 500 }
      );
    }

    if (EMAIL_PASS === "your_app_password_here") {
      return NextResponse.json(
        { error: "Setup Required: Please add your Gmail App Password to .env.local and restart the server." },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"The Interview App" <${EMAIL_USER}>`,
      to: email,
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
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "OTP sent successfully" });
  } catch (error: any) {
    console.error("Error sending OTP email:", error);
    return NextResponse.json(
      { error: `Email failed: ${error.message || "Check server logs"}` },
      { status: 500 }
    );
  }
}
