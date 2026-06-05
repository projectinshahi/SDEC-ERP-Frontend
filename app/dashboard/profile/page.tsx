'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiClient } from '@/lib/api/api-client';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Lock, Eye, EyeOff, Loader2, User as UserIcon, Mail, Shield, Phone, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
  return { score: 5, label: 'Strong', color: 'bg-emerald-500' };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading, updateUser } = useAuth();
  
  // Profile Form State
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    status: ''
  });
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Fetch Profile Data on Mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) return;
      try {
        const response = await apiClient.get<any>('/profile');
        setProfileData({
          name: response.data.name || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          role: response.data.role || '',
          status: response.data.status || ''
        });
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        toast.error('Failed to load profile data');
      } finally {
        setIsProfileLoading(false);
      }
    };
    fetchProfile();
  }, [isAuthenticated]);

  // Password requirement checks for visual hints
  const passwordChecks = useMemo(() => {
    return [
      { label: 'At least 8 characters', met: newPassword.length >= 8 },
      { label: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
      { label: 'Lowercase letter', met: /[a-z]/.test(newPassword) },
      { label: 'Number', met: /[0-9]/.test(newPassword) },
      { label: 'Special character', met: /[^A-Za-z0-9]/.test(newPassword) },
    ];
  }, [newPassword]);

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const isStrongEnough = passwordStrength.score === 5;
  const passwordsMatch = newPassword !== '' && newPassword === confirmPassword;

  // Protect route
  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    // Basic phone validation (if provided)
    if (profileData.phone && !/^\+?[0-9\s\-()]{7,15}$/.test(profileData.phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsSavingProfile(true);
    try {
      await apiClient.put('/profile', {
        name: profileData.name,
        phone: profileData.phone
      });
      toast.success('Profile updated successfully!');
      
      // Update local storage user state with new name
      const updatedUser = { ...user, name: profileData.name };
      updateUser(updatedUser);
      
    } catch (err: any) {
      console.error('[Profile] Error:', err);
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (!isStrongEnough) {
      setPasswordError('Please ensure your new password meets all security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      await apiClient.post('/profile/change-password', {
        currentPassword,
        newPassword
      });

      // Update local storage user state if needed
      const updatedUser = { ...user, mustChangePassword: false };
      updateUser(updatedUser);

      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Redirect to dashboard now that password is changed
      router.push('/dashboard');
    } catch (err: any) {
      console.error('[ChangePassword] Error:', err);
      setPasswordError(err.response?.data?.error || err.message || 'An error occurred while changing password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Profile</h1>
        <p className="text-gray-650 dark:text-gray-400 mt-2">Manage your account settings and change your password.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Profile Info Form */}
        <div className="space-y-6">
          <Card className="border border-gray-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm h-full">
            <CardHeader className="border-b border-gray-100 dark:border-slate-800/80 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Profile Information</h2>
            </CardHeader>
            <CardBody className="p-6 md:p-8">
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                  {profileData.name.charAt(0).toUpperCase()}
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <InputField
                  label="Full Name"
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  icon={UserIcon}
                  value={profileData.name}
                  onChange={(val) => setProfileData(prev => ({ ...prev, name: val }))}
                  required
                  disabled={isSavingProfile}
                  maxLength={100}
                />
                
                <InputField
                  label="Phone Number"
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  icon={Phone}
                  value={profileData.phone}
                  onChange={(val) => setProfileData(prev => ({ ...prev, phone: val }))}
                  disabled={isSavingProfile}
                  maxLength={50}
                />

                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-300 mb-4">Read-Only Fields</h3>
                  
                  <div className="space-y-4">
                    <InputField
                      label="Email Address"
                      id="email"
                      type="email"
                      icon={Mail}
                      value={profileData.email}
                      onChange={() => {}}
                      disabled={true}
                      className="bg-gray-50 dark:bg-slate-800 text-gray-500 cursor-not-allowed"
                    />
                    
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <InputField
                          label="Role"
                          id="role"
                          type="text"
                          icon={Shield}
                          value={profileData.role}
                          onChange={() => {}}
                          disabled={true}
                          className="bg-gray-50 dark:bg-slate-800 text-gray-500 cursor-not-allowed capitalize"
                        />
                      </div>
                      <div className="flex-1">
                        <InputField
                          label="Account Status"
                          id="status"
                          type="text"
                          icon={Activity}
                          value={profileData.status}
                          onChange={() => {}}
                          disabled={true}
                          className="bg-gray-50 dark:bg-slate-800 text-gray-500 cursor-not-allowed capitalize"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSavingProfile}
                    className="py-2.5 px-6 shadow-md hover:shadow-lg transition-all"
                  >
                    {isSavingProfile ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Change Password */}
        <div className="space-y-6">
          <Card className="border border-gray-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm h-full">
            <CardHeader className="border-b border-gray-100 dark:border-slate-800/80 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Security Settings</h2>
            </CardHeader>
            <CardBody className="p-6 md:p-8">
              {passwordError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
                  <div className="relative">
                    <InputField
                      label="Current Password"
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Enter your current password"
                      icon={Lock}
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      required
                      disabled={isSubmittingPassword}
                    />
                    {currentPassword && (
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-10 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <InputField
                      label="New Password"
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      icon={Lock}
                      value={newPassword}
                      onChange={setNewPassword}
                      required
                      disabled={isSubmittingPassword}
                    />
                    {newPassword && (
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-10 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                  
                  {/* Password Strength Bar */}
                  {newPassword && (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${passwordStrength.score >= level
                                  ? passwordStrength.color
                                  : 'bg-gray-200 dark:bg-gray-700'
                                }`}
                            />
                          ))}
                        </div>
                        <span className={`text-xs font-bold ${passwordStrength.score <= 1 ? 'text-red-500' :
                            passwordStrength.score <= 2 ? 'text-orange-500' :
                              passwordStrength.score <= 3 ? 'text-yellow-600' :
                                'text-emerald-600'
                          }`}>
                          {passwordStrength.label}
                        </span>
                      </div>

                      {/* Password requirement checklist */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {passwordChecks.map((check) => (
                          <div
                            key={check.label}
                            className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ${check.met ? 'text-emerald-600' : 'text-gray-400'
                              }`}
                          >
                            {check.met ? (
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <circle cx="12" cy="12" r="9" strokeWidth={2} />
                              </svg>
                            )}
                            <span>{check.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <InputField
                    label="Confirm New Password"
                    id="confirmPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    icon={Lock}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    required
                    disabled={isSubmittingPassword}
                    error={confirmPassword && !passwordsMatch ? 'Passwords do not match' : undefined}
                    showSuccess={confirmPassword !== '' && passwordsMatch}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingPassword || !isStrongEnough || !passwordsMatch || !currentPassword}
                    className="py-2.5 px-6 shadow-md hover:shadow-lg transition-all"
                  >
                    {isSubmittingPassword ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Changing...
                      </span>
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
