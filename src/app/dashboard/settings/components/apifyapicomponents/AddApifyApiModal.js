'use client';

import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../components/AuthProvider';

export default function AddApifyApiModal({ isOpen, onClose, onAdd }) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    api_name: '',
    api_key: '',
    staus: true, // true maps to 'active', false maps to 'inactive'
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to add configurations");
      return;
    }

    if (!formData.api_name.trim()) {
      toast.error("Account name is required");
      return;
    }

    if (!formData.api_key.trim()) {
      toast.error("Apify API key is required");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("apify_apis")
        .insert([
          {
            user_id: user.id,
            api_name: formData.api_name.trim(),
            api_key: formData.api_key.trim(),
            staus: formData.staus ? 'active' : 'inactive',
          }
        ])
        .select()
        .single();

      if (error) {
        console.error("Supabase Error Details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        toast.error(`Failed to add Apify configuration: ${error.message || 'Unknown error'}`);
        return;
      }

      onAdd(data);
      toast.success("Apify configuration added successfully!");
      onClose();

      // Reset form
      setFormData({
        api_name: '',
        api_key: '',
        staus: true,
      });

    } catch (err) {
      console.error(err);
      toast.error("Error adding Apify configuration");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Add Apify Key</h3>
          <p className="text-sm text-gray-500">Provide an account label and your Apify API key</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name *
            </label>
            <input
              type="text"
              required
              value={formData.api_name}
              onChange={(e) => setFormData({ ...formData, api_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm focus:outline-none"
              placeholder="e.g. Personal Account, Production Client"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apify API Key *
            </label>
            <input
              type="password"
              required
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm focus:outline-none font-mono"
              placeholder="apify_api_..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="staus-active"
              checked={formData.staus}
              onChange={(e) => setFormData({ ...formData, staus: e.target.checked })}
              className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="staus-active" className="text-sm text-gray-700 select-none">
              Active (Enabled for scrapers)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center"
            >
              {loading ? "Adding..." : "Add Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
