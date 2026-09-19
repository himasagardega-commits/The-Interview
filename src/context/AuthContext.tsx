"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserProfile } from "@/types";
import { getStoredUser, setStoredUser } from "@/lib/storage";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  loginWithEmail: (email: string, password: string) => void;
  registerWithEmail: (email: string, password: string, name: string) => void;
  checkUserExists: (email: string) => boolean;
  resetPassword: (email: string, newPassword: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const saved = getStoredUser();
    if (saved) {
      setUser(saved);
    }
    // We no longer auto-login a default user.
    // If there is no user, they stay logged out (user === null).
    setIsLoading(false);
  }, []);

  const loginWithEmail = (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Fetch registered users from localStorage
    const rawUsers = localStorage.getItem("the_interview_registered_users");
    const users = rawUsers ? JSON.parse(rawUsers) : [];
    
    const existingUser = users.find((u: any) => u.email === cleanEmail);
    if (!existingUser) {
      throw new Error("No account found with this email.");
    }
    if (existingUser.password !== password) {
      throw new Error("Incorrect password.");
    }
    
    const profileUser: UserProfile = {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(existingUser.name)}&background=4f46e5&color=fff&bold=true`,
      role: "Candidate",
      totalInterviews: existingUser.totalInterviews || 0,
      createdAt: existingUser.createdAt,
    };
    
    setUser(profileUser);
    setStoredUser(profileUser);
  };

  const registerWithEmail = (email: string, password: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Fetch registered users
    const rawUsers = localStorage.getItem("the_interview_registered_users");
    const users = rawUsers ? JSON.parse(rawUsers) : [];
    
    if (users.find((u: any) => u.email === cleanEmail)) {
      throw new Error("An account with this email already exists.");
    }
    
    const newUserRecord = {
      id: `usr-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      email: cleanEmail,
      password, // In a real app this would be hashed
      totalInterviews: 0,
      createdAt: new Date().toISOString(),
    };
    
    users.push(newUserRecord);
    localStorage.setItem("the_interview_registered_users", JSON.stringify(users));
  };

  const checkUserExists = (email: string) => {
    const rawUsers = localStorage.getItem("the_interview_registered_users");
    const users = rawUsers ? JSON.parse(rawUsers) : [];
    return !!users.find((u: any) => u.email === email.trim().toLowerCase());
  };

  const resetPassword = (email: string, newPassword: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const rawUsers = localStorage.getItem("the_interview_registered_users");
    const users = rawUsers ? JSON.parse(rawUsers) : [];
    const index = users.findIndex((u: any) => u.email === cleanEmail);
    if (index === -1) throw new Error("User not found.");
    
    if (users[index].password === newPassword) {
      throw new Error("New password cannot be the same as your old password.");
    }
    
    users[index].password = newPassword;
    localStorage.setItem("the_interview_registered_users", JSON.stringify(users));
  };

  const logout = () => {
    setUser(null);
    setStoredUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithEmail,
        registerWithEmail,
        checkUserExists,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
