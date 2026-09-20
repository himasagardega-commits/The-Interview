import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Mail, Lock, User, ArrowRight, KeyRound, CheckCircle2 } from "lucide-react";

export const LoginPage: React.FC = () => {
  const { loginWithEmail, registerWithEmail, checkUserExists, resetPassword } = useAuth();
  
  const [view, setView] = useState<"login" | "register" | "forgot" | "reset">("login");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // OTP related states
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const switchView = (newView: "login" | "register" | "forgot" | "reset") => {
    setView(newView);
    clearMessages();
    setPassword("");
    setOtpInput("");
  };

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pass)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(pass)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "Password must contain at least one special symbol.";
    return null;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    try {
      if (!name.trim()) throw new Error("Full name is required.");
      const passwordError = validatePassword(password);
      if (passwordError) throw new Error(passwordError);
      
      await registerWithEmail(email, password, name);
      switchView("login");
      setSuccess("Registration successful. Please log in.");
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    
    const userExists = await checkUserExists(email);
    if (!userExists) {
      setError("No account found with this email address.");
      return;
    }

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(otp);
    
    setIsSendingOtp(true);
    try {
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setSuccess("OTP has been sent to your email.");
      switchView("reset");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send OTP email.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    if (otpInput !== generatedOtp) {
      setError("Invalid OTP. Please try again.");
      return;
    }
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
    try {
      await resetPassword(email, password);
      setSuccess("Password has been reset successfully. Please log in.");
      switchView("login");
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      
      {/* Left Form Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Header / Brand */}
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-8 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-8 -mb-8 blur-xl"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm p-1 shadow-lg border border-white/20 mb-4 overflow-hidden">
                <img src="/app-icon.jpg" alt="The Interview" className="w-full h-full object-cover rounded-xl" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">The Interview</h1>
              <p className="text-sm font-medium text-indigo-100 mt-2 opacity-90">
                Personalized Mock Interview & ATS Evaluation
              </p>
            </div>
          </div>

          {/* Form Container */}
          <div className="p-8">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-slate-800">
                {view === "login" && "Welcome back"}
                {view === "register" && "Create an account"}
                {view === "forgot" && "Forgot Password"}
                {view === "reset" && "Reset Password"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {view === "login" && "Sign in to continue your interview prep"}
                {view === "register" && "Sign up to start practicing"}
                {view === "forgot" && "Enter your email to receive an OTP"}
                {view === "reset" && "Enter the 4-digit OTP sent to your email"}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm font-medium text-center">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-medium text-center">
                {success}
              </div>
            )}

            {/* VIEW: LOGIN */}
            {view === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800 transition"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
                    <label className="block text-xs font-semibold text-slate-700">Password</label>
                    <button 
                      type="button" 
                      onClick={() => switchView("forgot")}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800 transition"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition group"
                >
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            )}

            {/* VIEW: REGISTER */}
            {view === "register" && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800 transition"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800 transition"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800 transition"
                      placeholder="••••••••"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 ml-1">
                    Min 8 chars, 1 uppercase, 1 number, 1 symbol.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition group"
                >
                  Create Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            )}

            {/* VIEW: FORGOT PASSWORD */}
            {view === "forgot" && (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800 transition"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 disabled:hover:bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition group"
                >
                  {isSendingOtp ? (
                    <>Sending...</>
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* VIEW: RESET PASSWORD */}
            {view === "reset" && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">4-Digit OTP</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <KeyRound className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800 transition tracking-widest font-mono"
                      placeholder="1234"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm text-slate-800 transition"
                      placeholder="••••••••"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 ml-1">
                    Min 8 chars, 1 uppercase, 1 number, 1 symbol.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition group"
                >
                  Update Password
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Footer Navigation */}
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-600 flex items-center justify-center gap-1.5">
                {(view === "forgot" || view === "reset") ? (
                  <>
                    Remembered your password?
                    <button
                      type="button"
                      onClick={() => switchView("login")}
                      className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition"
                    >
                      Back to sign in
                    </button>
                  </>
                ) : view === "login" ? (
                  <>
                    Don't have an account?
                    <button
                      type="button"
                      onClick={() => switchView("register")}
                      className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?
                    <button
                      type="button"
                      onClick={() => switchView("login")}
                      className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Graphic Side */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-900 border-l border-slate-200/50 shadow-2xl">
        <img 
          src="/app-icon.jpg" 
          alt="App Graphic" 
          className="absolute inset-0 w-full h-full object-cover opacity-90" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent"></div>
        <div className="absolute bottom-10 left-10 right-10 p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-2">Master Your Interviews</h3>
          <p className="text-white/80 font-medium">Practice with AI-powered mock interviews tailored specifically to your resume and target job description.</p>
        </div>
      </div>
    </div>
  );
};
