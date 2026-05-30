'use client';

import { FiAlertTriangle, FiX } from 'react-icons/fi';

export default function DeleteApifyConfirmationModal({ isOpen, onClose, onConfirm, config }) {
  if (!isOpen || !config) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md p-6 bg-white rounded-2xl shadow-xl mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
            <FiAlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Apify Key</h3>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to delete the Apify API credentials for <span className="font-semibold text-gray-700">"{config.api_name}"</span>? 
            This action cannot be undone and scrapers using this key will fail.
          </p>

          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(config.id)}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              Delete Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
