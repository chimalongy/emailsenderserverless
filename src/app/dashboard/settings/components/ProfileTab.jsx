'use client';

import { useState, useEffect } from 'react';
import { FiSave, FiMail } from 'react-icons/fi';
import { useAuth } from '../../../components/AuthProvider';
import { toast } from 'react-hot-toast';

export default function ProfileTab() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    email: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setProfileData({
        email: user.email || ''
      });
      setIsLoading(false);
    }
  }, [user]);

  const handleProfileSave = async () => {
    try {
      // Here you can add logic to update the user's email if needed
      // For now, we'll just show a success message
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Account Information</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={profileData.email}
                readOnly
                className="w-full max-w-md pl-10 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Contact support if you need to update your email address.
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={handleProfileSave}
        className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
      >
        <FiSave className="w-4 h-4" />
        Save Changes
      </button>
    </div>
  );
}