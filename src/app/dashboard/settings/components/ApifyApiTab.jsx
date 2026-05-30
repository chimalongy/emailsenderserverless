'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../components/AuthProvider';
import {
  FiCopy, FiEye, FiEyeOff, FiCheck, FiPlus,
  FiChevronDown, FiChevronUp, FiClock, FiActivity, FiKey,
  FiEdit2, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import AddApifyApiModal from './apifyapicomponents/AddApifyApiModal';
import DeleteApifyConfirmationModal from './apifyapicomponents/DeleteApifyConfirmationModal';
import EditApifyApiModal from './apifyapicomponents/EditApifyApiModal';

export default function ApifyApiTab() {
  const { user } = useAuth();
  const [apifyConfigs, setApifyConfigs] = useState([]);
  const [showKeys, setShowKeys] = useState({});
  const [copiedKeyId, setCopiedKeyId] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState({});
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [configToDelete, setConfigToDelete] = useState(null);
  const [configToEdit, setConfigToEdit] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch configurations from Supabase for the logged-in user
  const fetchConfigs = async () => {
    setLoading(true);

    if (!user) {
      setLoading(false);
      console.log("No authenticated user found for settings page");
      return;
    }

    const { data, error } = await supabase
      .from('apify_apis')
      .select('*')
      .eq('user_id', user.id) // filter by logged-in user's ID
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Supabase Fetch Error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error(`Failed to fetch Apify configurations: ${error.message || 'Unknown error'}`);
    } else {
      setApifyConfigs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, [user]);

  const copyToClipboard = async (text, configId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(configId);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const toggleKeyVisibility = (configId) => {
    setShowKeys(prev => ({ ...prev, [configId]: !prev[configId] }));
  };

  const toggleExpand = (configId) => {
    setExpandedKeys(prev => ({ ...prev, [configId]: !prev[configId] }));
  };

  const handleAddConfig = (newConfig) => {
    setApifyConfigs([newConfig, ...apifyConfigs]);
    setExpandedKeys(prev => ({ ...prev, [newConfig.id]: true }));
  };

  const handleDeleteConfig = async (configId) => {
    const { error } = await supabase
      .from('apify_apis')
      .delete()
      .eq('id', configId);

    if (error) {
      console.error("Supabase Delete Error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error(`Failed to delete Apify configuration: ${error.message || 'Unknown error'}`);
    } else {
      setApifyConfigs(apifyConfigs.filter(config => config.id !== configId));
      setConfigToDelete(null);
      setIsDeleteModalOpen(false);
      toast.success('Apify key deleted successfully');
    }
  };

  const handleUpdateConfig = (configId, updatedConfig) => {
    setApifyConfigs(apifyConfigs.map(config =>
      config.id === configId ? updatedConfig : config
    ));
    setConfigToEdit(null);
    setIsEditModalOpen(false);
  };

  const toggleActiveStatus = async (configId) => {
    const config = apifyConfigs.find(c => c.id === configId);
    const newActiveStatus = config.staus === 'active' ? 'inactive' : 'active';

    const { error } = await supabase
      .from('apify_apis')
      .update({ staus: newActiveStatus })
      .eq('id', configId);

    if (error) {
      console.error("Supabase Status Update Error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error(`Failed to update configuration status: ${error.message || 'Unknown error'}`);
    } else {
      setApifyConfigs(apifyConfigs.map(c =>
        c.id === configId ? { ...c, staus: newActiveStatus } : c
      ));
      toast.success(`Apify key ${newActiveStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm mt-2">Loading Apify credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Apify API Credentials</h2>
          <p className="text-gray-500 text-sm sm:text-base mt-1">
            Store and manage multiple Apify keys for background scrapers and automations.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm"
        >
          <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Add Apify Key</span>
        </button>
      </div>

      {/* Configurations List */}
      <div className="space-y-4">
        {apifyConfigs.length > 0 ? (
          apifyConfigs.map((config) => (
            <div key={config.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:border-gray-300 transition-colors">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${config.staus === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      <FiActivity className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{config.api_name || 'Unnamed Account'}</h3>
                      <p className="text-xs text-gray-500">
                        Added on {new Date(config.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => toggleActiveStatus(config.id)}
                      className={`p-2 rounded-full transition-colors ${config.staus === 'active' ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                      title={config.staus === 'active' ? 'Active (Enabled)' : 'Inactive (Disabled)'}
                    >
                      {config.staus === 'active' ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
                    </button>
                    
                    <button
                      onClick={() => {
                        setConfigToEdit(config);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors"
                      title="Edit"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        setConfigToDelete(config);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => toggleExpand(config.id)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      {expandedKeys[config.id] ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedKeys[config.id] && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Apify API Key</h4>
                      <div className="flex items-center bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                        <input
                          type={showKeys[config.id] ? 'text' : 'password'}
                          value={config.api_key}
                          readOnly
                          className="flex-1 bg-transparent px-3 py-2 text-sm font-mono text-gray-700 focus:outline-none"
                        />
                        <div className="flex items-center space-x-1 pr-2">
                          <button
                            onClick={() => toggleKeyVisibility(config.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                            title={showKeys[config.id] ? 'Hide Key' : 'Show Key'}
                          >
                            {showKeys[config.id] ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(config.api_key, config.id)}
                            className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedKeyId === config.id ? <FiCheck className="w-4 h-4 text-green-500" /> : <FiCopy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
                      <div className="flex items-center space-x-1">
                        <FiClock className="w-3.5 h-3.5" />
                        <span>Created {new Date(config.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FiKey className="w-3.5 h-3.5" />
                        <span>ID: {config.id}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200 p-6">
            <FiKey className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-800">No Apify credentials</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first Apify API Key.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                Add Apify Key
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddApifyApiModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddConfig}
      />

      <DeleteApifyConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setConfigToDelete(null);
        }}
        onConfirm={handleDeleteConfig}
        config={configToDelete}
      />

      <EditApifyApiModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setConfigToEdit(null);
        }}
        config={configToEdit}
        onUpdate={handleUpdateConfig}
      />
    </div>
  );
}
