// app/dashboard/settings/page.js
'use client';

import { useState } from 'react';
import { FiUser, FiShield, FiKey, FiBell, FiGlobe } from 'react-icons/fi';
import { Toaster } from 'react-hot-toast';
import ProfileTab from './components/ProfileTab';
import AccountTab from './components/AccountTab';
import SecurityTab from './components/SecurityTab';
import QStashTab from './components/QStashTab';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: <FiUser className="w-4 h-4" />,
      description: 'Update your personal information'
    },
    { 
      id: 'account', 
      label: 'Account', 
      icon: <FiGlobe className="w-4 h-4" />,
      description: 'Manage account preferences'
    },
    { 
      id: 'security', 
      label: 'Security', 
      icon: <FiShield className="w-4 h-4" />,
      description: 'Password and security settings'
    },
    { 
      id: 'qstash', 
      label: 'QStash', 
      icon: <FiKey className="w-4 h-4" />,
      description: 'API and integration settings'
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'account':
        return <AccountTab />;
      case 'security':
        return <SecurityTab />;
      case 'qstash':
        return <QStashTab />;
      default:
        return (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <FiUser className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Select a settings category</h3>
            <p className="text-gray-500">Choose from the left menu to manage your settings</p>
          </div>
        );
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-teal-50 rounded-lg">
              <FiUser className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Manage your account preferences and security
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tab Navigation */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex flex-col items-start text-left p-3 rounded-lg transition-colors duration-150
                      ${activeTab === tab.id
                        ? 'bg-teal-50 text-teal-700 border border-teal-100'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center w-full">
                      <span className={`mr-3 ${activeTab === tab.id ? 'text-teal-600' : 'text-gray-400'}`}>
                        {tab.icon}
                      </span>
                      <span className="font-medium text-sm flex-1">{tab.label}</span>
                      {activeTab === tab.id && (
                        <div className="h-2 w-2 bg-teal-500 rounded-full"></div>
                      )}
                    </div>
                    <p className={`text-xs mt-1 ml-6 ${activeTab === tab.id ? 'text-teal-600' : 'text-gray-500'}`}>
                      {tab.description}
                    </p>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Content Header */}
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      {tabs.find(t => t.id === activeTab)?.label || 'Settings'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-0.5">
                      {tabs.find(t => t.id === activeTab)?.description || 'Manage your settings'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {activeTab === 'profile' && 'Personal'}
                    {activeTab === 'account' && 'Preferences'}
                    {activeTab === 'security' && 'Protected'}
                    {activeTab === 'qstash' && 'Advanced'}
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-5">
                {renderTabContent()}
              </div>
            </div>

            {/* Settings Help */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FiBell className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm mb-1">Settings Help</h4>
                  <p className="text-gray-600 text-sm">
                    Changes to your settings are saved automatically. For security-related changes,
                    you may need to verify your identity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}