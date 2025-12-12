'use client';

import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../components/AuthProvider';

export default function AddQStashModal({ isOpen, onClose, onAdd }) {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    token: '',
    current_signing_key: '',
    next_signing_key: '',
    active: true,
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to add configurations");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("qstash_tokens")
        .insert([
          {
            user_id: user.id,
            token: formData.token,
            current_signing_key: formData.current_signing_key,
            next_signing_key: formData.next_signing_key,
            active: formData.active,
          }
        ])
        .select()
        .single(); // return inserted row

      if (error) {
        console.error(error);
        toast.error("Failed to add configuration");
        return;
      }

      // Push into parent list
      onAdd(data);

      toast.success("QStash configuration added!");
      onClose();

      // Reset form
      setFormData({
        token: '',
        current_signing_key: '',
        next_signing_key: '',
        active: true,
      });

    } catch (error) {
      console.error(error);
      toast.error("Error adding configuration");
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
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <FiX className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Add QStash Configuration</h3>
          <p className="text-sm text-gray-500">Enter token and signing keys</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QSTASH_TOKEN *</label>
            <input
              type="text"
              required
              value={formData.token}
              onChange={(e) => setFormData({ ...formData, token: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Enter token"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QSTASH_CURRENT_SIGNING_KEY *</label>
            <input
              type="text"
              required
              value={formData.current_signing_key}
              onChange={(e) => setFormData({ ...formData, current_signing_key: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Enter current signing key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">QSTASH_NEXT_SIGNING_KEY *</label>
            <input
              type="text"
              required
              value={formData.next_signing_key}
              onChange={(e) => setFormData({ ...formData, next_signing_key: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Enter next signing key"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <label className="text-sm text-gray-700">Active</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              {loading ? "Adding..." : "Add Configuration"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}