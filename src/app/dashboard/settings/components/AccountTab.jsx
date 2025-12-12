'use client';

export default function AccountTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Account Settings</h3>
      <div className="space-y-4">
        <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Danger Zone</h4>
          <p className="text-gray-600 text-sm mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}