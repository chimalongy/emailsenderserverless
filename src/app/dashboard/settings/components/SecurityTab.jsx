'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { FiEye, FiEyeOff, FiLock, FiCheck, FiAlertCircle } from 'react-icons/fi';

export default function SecurityTab() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // First, reauthenticate the user
      const { data: user, error: authError } = await supabase.auth.updateUser({
        password: formData.newPassword
      });
      
      if (authError) throw authError;
      
      // Clear form on success
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Password updated successfully!');
    } catch (error) {
      console.error('Error updating password:', error);
      
      let errorMessage = 'Failed to update password';
      if (error.message.includes('Auth session missing')) {
        errorMessage = 'Your session has expired. Please sign in again.';
      } else if (error.message.includes('password')) {
        errorMessage = 'Invalid current password';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const PasswordInput = ({ name, placeholder, value, onChange, error, showPassword, toggleShow }) => (
    <div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiLock className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border ${
            error ? 'border-red-300' : 'border-gray-300'
          } rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent`}
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          {showPassword ? (
            <FiEyeOff className="h-5 w-5 text-gray-400" />
          ) : (
            <FiEye className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <FiAlertCircle className="mr-1" />
          {error}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Security Settings</h3>
        <p className="text-sm text-gray-500 mb-6">
          Manage your password and security settings
        </p>
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h4 className="text-md font-medium text-gray-900 mb-6">Change Password</h4>
        
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <PasswordInput
            name="currentPassword"
            placeholder="Current Password"
            value={formData.currentPassword}
            onChange={handleChange}
            error={errors.currentPassword}
            showPassword={showPassword.current}
            toggleShow={() => togglePasswordVisibility('current')}
          />
          
          <div className="pt-2">
            <PasswordInput
              name="newPassword"
              placeholder="New Password"
              value={formData.newPassword}
              onChange={handleChange}
              error={errors.newPassword}
              showPassword={showPassword.new}
              toggleShow={() => togglePasswordVisibility('new')}
            />
            {!errors.newPassword && formData.newPassword && (
              <p className="mt-2 text-xs text-gray-500">
                <FiCheck className="inline mr-1 text-green-500" />
                {formData.newPassword.length >= 8 
                  ? 'Password is strong enough' 
                  : 'Use at least 8 characters'}
              </p>
            )}
          </div>
          
          <PasswordInput
            name="confirmPassword"
            placeholder="Confirm New Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            showPassword={showPassword.confirm}
            toggleShow={() => togglePasswordVisibility('confirm')}
          />
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-white ${
                isLoading 
                  ? 'bg-teal-400 cursor-not-allowed' 
                  : 'bg-teal-600 hover:bg-teal-700'
              } transition-colors flex items-center justify-center`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-8 p-6 bg-yellow-50 border border-yellow-100 rounded-xl">
        <h4 className="text-md font-medium text-yellow-800 mb-2">Security Tips</h4>
        <ul className="text-sm text-yellow-700 space-y-1.5">
          <li className="flex items-start">
            <FiCheck className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
            <span>Use a strong, unique password that you don't use elsewhere</span>
          </li>
          <li className="flex items-start">
            <FiCheck className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
            <span>Consider using a password manager to generate and store your passwords</span>
          </li>
          <li className="flex items-start">
            <FiCheck className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
            <span>Enable two-factor authentication for added security</span>
          </li>
        </ul>
      </div>
    </div>
  );
}