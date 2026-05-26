import { apiClient } from './api-client';

/**
 * Forgot Password API
 * Request password reset email
 */
export async function forgotPasswordApi(email: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/auth/forgot-password', { email });
  return response.data;
}

/**
 * Validate Reset Token API
 * Check if reset token is valid
 */
export async function validateResetTokenApi(token: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/auth/validate-reset-token', { token });
  return response.data;
}

/**
 * Reset Password API
 * Submit new password with reset token
 */
export async function resetPasswordApi(
  token: string,
  password: string,
  confirmPassword: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/auth/reset-password', {
    token,
    password,
    confirmPassword,
  });
  return response.data;
}
