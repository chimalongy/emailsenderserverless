'use client';

import { FiAlertTriangle, FiTrash2, FiX, FiKey } from 'react-icons/fi';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, config }) {
  if (!isOpen || !config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl relative mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
        >
          <FiX className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-50 rounded-lg">
            <FiAlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Delete Configuration</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>

        {/* Warning */}
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg mb-4 text-sm text-red-800">
          You are about to delete this QStash configuration. All associated keys will be revoked immediately.
        </div>

        {/* Config details */}
        <div className="p-4 bg-gray-50 rounded-lg mb-4 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <FiKey className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-gray-700">Name:</div>
              <div className="font-mono truncate text-gray-600">{config.name || 'Unnamed Configuration'}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FiKey className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-gray-700">Token:</div>
              <div className="font-mono truncate text-gray-600">{config.token?.substring(0, 30)}...</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FiKey className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-gray-700">Current Signing Key:</div>
              <div className="font-mono truncate text-gray-600">{config.current_signing_key?.substring(0, 30)}...</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FiKey className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-gray-700">Next Signing Key:</div>
              <div className="font-mono truncate text-gray-600">{config.next_signing_key?.substring(0, 30)}...</div>
            </div>
          </div>
          <div className="pt-2 border-t border-gray-200">
            <span className="font-medium text-gray-700">Active:</span> 
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${config.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {config.active ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Created:</span> 
            <span className="text-gray-600 ml-2">{new Date(config.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(config.id)}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <FiTrash2 className="w-4 h-4" />
            Delete Configuration
          </button>
        </div>
      </div>
    </div>
  );
}