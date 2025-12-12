'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../components/AuthProvider'
import {
  FiCopy, FiEye, FiEyeOff, FiCheck, FiExternalLink, FiPlus,
  FiChevronDown, FiChevronUp, FiClock, FiActivity, FiKey,
  FiRefreshCw, FiEdit2, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import AddQStashModal from "./qstashtabcomponents/AddQStashModal";
import DeleteConfirmationModal from './qstashtabcomponents/DeleteConfirmationModal';
import EditQStashModal from './qstashtabcomponents/EditQStashModal';


export default function QStashTab() {
    const { user} = useAuth()
  const [qstashConfigs, setQstashConfigs] = useState([]);
  const [showTokens, setShowTokens] = useState({});
  const [copiedTokenId, setCopiedTokenId] = useState(null);
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
        console.log("no user")
      return;
    }

    console.log(user)

    const { data, error } = await supabase
      .from('qstash_tokens')
      .select('*')
      .eq('user_id', user.id)  // filter by logged-in user's ID
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch configurations');
      console.error(error);
    } else {
      setQstashConfigs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, [user]);  // refetch when the user changes

  const copyToClipboard = async (text, configId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTokenId(configId);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedTokenId(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const toggleTokenVisibility = (configId) => {
    setShowTokens(prev => ({ ...prev, [configId]: !prev[configId] }));
  };

  const toggleExpand = (configId) => {
    setExpandedKeys(prev => ({ ...prev, [configId]: !prev[configId] }));
  };

  const handleAddConfig = (newConfig) => {
    setQstashConfigs([newConfig, ...qstashConfigs]);
    setExpandedKeys(prev => ({ ...prev, [newConfig.id]: true }));
  };

  const handleDeleteConfig = async (configId) => {
    const { error } = await supabase
      .from('qstash_tokens')
      .delete()
      .eq('id', configId);

    if (error) {
      toast.error('Failed to delete configuration');
      console.error(error);
    } else {
      setQstashConfigs(qstashConfigs.filter(config => config.id !== configId));
      setConfigToDelete(null);
      setIsDeleteModalOpen(false);
      toast.success('Configuration deleted successfully');
    }
  };

  const handleUpdateConfig = (configId, updatedConfig) => {
    setQstashConfigs(qstashConfigs.map(config =>
      config.id === configId ? updatedConfig : config
    ));
    setConfigToEdit(null);
    setIsEditModalOpen(false);
  };

  const toggleActiveStatus = async (configId) => {
    const config = qstashConfigs.find(c => c.id === configId);
    const newActive = !config.active;

    const { error } = await supabase
      .from('qstash_tokens')
      .update({ active: newActive })
      .eq('id', configId);

    if (error) {
      toast.error('Failed to update status');
      console.error(error);
    } else {
      setQstashConfigs(qstashConfigs.map(c =>
        c.id === configId ? { ...c, active: newActive } : c
      ));
      toast.success(`Configuration ${newActive ? 'activated' : 'deactivated'} successfully`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <p className="text-gray-500">Loading configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">QStash Configurations</h2>
          <p className="text-gray-500 text-sm sm:text-base mt-1 sm:mt-2">
            Manage your QStash tokens and signing keys
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Add Configuration</span>
        </button>
      </div>

      {/* Configurations List */}
      <div className="space-y-4">
        {qstashConfigs.length > 0 ? (
          qstashConfigs.map((config) => (
            <div key={config.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${config.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                      <FiActivity className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{config.name || 'Unnamed Configuration'}</h3>
                      <p className="text-sm text-gray-500">
                        Created on {new Date(config.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleActiveStatus(config.id)}
                      className={`p-2 rounded-full ${config.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                      title={config.active ? 'Active' : 'Inactive'}
                    >
                      {config.active ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => {
                        setConfigToEdit(config);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-full"
                      title="Edit"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setConfigToDelete(config);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleExpand(config.id)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                    >
                      {expandedKeys[config.id] ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedKeys[config.id] && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">QStash Token</h4>
                      <div className="flex items-center bg-gray-50 rounded-md overflow-hidden">
                        <input
                          type={showTokens[config.id] ? 'text' : 'password'}
                          value={config.token}
                          readOnly
                          className="flex-1 bg-transparent px-3 py-2 text-sm font-mono text-gray-700 focus:outline-none"
                        />
                        <div className="flex items-center space-x-1 pr-2">
                          <button
                            onClick={() => toggleTokenVisibility(config.id)}
                            className="p-1.5 text-gray-500 hover:text-gray-700"
                            title={showTokens[config.id] ? 'Hide' : 'Show'}
                          >
                            {showTokens[config.id] ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(config.token, config.id)}
                            className="p-1.5 text-gray-500 hover:text-teal-600"
                            title="Copy to clipboard"
                          >
                            {copiedTokenId === config.id ? <FiCheck className="w-4 h-4 text-green-500" /> : <FiCopy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Current Signing Key</h4>
                        <div className="flex items-center bg-gray-50 rounded-md overflow-hidden">
                          <input
                            type={showTokens[config.id] ? 'text' : 'password'}
                            value={config.current_signing_key}
                            readOnly
                            className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none"
                          />
                          <div className="flex items-center pr-2">
                            <button
                              onClick={() => copyToClipboard(config.current_signing_key, `signing-${config.id}`)}
                              className="p-1.5 text-gray-500 hover:text-teal-600"
                              title="Copy to clipboard"
                            >
                              {copiedTokenId === `signing-${config.id}` ? <FiCheck className="w-4 h-4 text-green-500" /> : <FiCopy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Next Signing Key</h4>
                        <div className="flex items-center bg-gray-50 rounded-md overflow-hidden">
                          <input
                            type={showTokens[config.id] ? 'text' : 'password'}
                            value={config.next_signing_key}
                            readOnly
                            className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none"
                          />
                          <div className="flex items-center pr-2">
                            <button
                              onClick={() => copyToClipboard(config.next_signing_key, `next-signing-${config.id}`)}
                              className="p-1.5 text-gray-500 hover:text-teal-600"
                              title="Copy to clipboard"
                            >
                              {copiedTokenId === `next-signing-${config.id}` ? <FiCheck className="w-4 h-4 text-green-500" /> : <FiCopy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                      <div className="flex items-center space-x-1">
                        <FiClock className="w-3.5 h-3.5" />
                        <span>Updated {new Date(config.updated_at).toLocaleString()}</span>
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
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
            <FiKey className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-800">No QStash configurations</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a new QStash configuration.</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                Add Configuration
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddQStashModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddConfig}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setConfigToDelete(null);
        }}
        onConfirm={handleDeleteConfig}
        config={configToDelete}
      />

      <EditQStashModal
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