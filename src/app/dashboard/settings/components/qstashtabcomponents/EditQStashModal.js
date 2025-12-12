'use client';

import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabase';

export default function EditQStashModal({ isOpen, onClose, config, onUpdate }) {
  const [formData, setFormData] = useState({
    token: '',
    current_signing_key: '',
    next_signing_key: '',
    active: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        token: config.token || '',
        current_signing_key: config.current_signing_key || '',
        next_signing_key: config.next_signing_key || '',
        active: config.active,
      });
    }
  }, [config]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('qstash_tokens')
        .update({
          token: formData.token,
          current_signing_key: formData.current_signing_key,
          next_signing_key: formData.next_signing_key,
          active: formData.active,
        })
        .eq('id', config.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(config.id, data);
      toast.success('Configuration updated successfully!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white w-full max-w-lg p-6 rounded-2xl shadow-xl relative mx-4">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
        >
          <FiX className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Edit QStash Configuration</h3>
          <p className="text-sm text-gray-500">Update token and signing keys</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* TOKEN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QSTASH_TOKEN *</label>
            <input
              type="text"
              required
              value={formData.token}
              onChange={(e) => setFormData({ ...formData, token: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* CURRENT SIGNING KEY */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QSTASH_CURRENT_SIGNING_KEY *</label>
            <input
              type="text"
              required
              value={formData.current_signing_key}
              onChange={(e) =>
                setFormData({ ...formData, current_signing_key: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* NEXT SIGNING KEY */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QSTASH_NEXT_SIGNING_KEY *</label>
            <input
              type="text"
              required
              value={formData.next_signing_key}
              onChange={(e) =>
                setFormData({ ...formData, next_signing_key: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* ACTIVE TOGGLE */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700">Active</span>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}