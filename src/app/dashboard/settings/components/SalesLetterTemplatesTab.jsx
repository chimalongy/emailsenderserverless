'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../components/AuthProvider';
import { toast } from 'react-hot-toast';
import {
  FiSave, FiPlus, FiTrash2, FiPlusCircle, FiChevronDown, FiChevronUp,
  FiFileText, FiFolderPlus, FiInfo, FiCode
} from 'react-icons/fi';

const DEFAULT_TEMPLATES = {
  first_outbound_templates: [
    `Subject: INQUIRY - (thedomainname.com)

Hello,

Would you be interested in acquiring the domain name TheDomainName .com?

Best regards,`,
    `Hello,

Reaching out about SanFranciscoFootAndAnkle .Com, which could be a strong fit for your practice as you serve San Francisco clients.

Do get in touch if you see value in this.`
  ],
  second_outbound_templates: [
    `Subject: MUST BE SAME WITH THE FIRST OUTBOUNND

Hi,

I wanted to put this on your radar.

This exact-match domain signals relevance directly to search engines. San Francisco residents searching for "foot and ankle" care are far more likely to click a domain that exactly matches what they typed.

No site rebuild needed. Redirect it to your existing practice and bring in more local clients.

Priced at {price} on GoDaddy. To get it, visit sanfranciscofootandankle.com (notice all in small letters and no spaces)

Best regards,`
  ],
  third_outbound_templates: [
    `Subject: MUST BE SAME WITH THE FIRST OUTBOUNND

Hi,

Checking back in on SanFranciscoFootAndAnkle.Com.

Available for {price}, this exact-match URL puts your practice in front of San Francisco residents already searching for foot and ankle care. Use it as a redirect to your existing site, or set up a San Francisco-focused landing page on it to bring in more local patient inquiries directly.

If it's not for you, no problem. But if local search visibility matters to your practice, this is a straightforward way to get more of it.

Visit sanfranciscofootandankle.com or reply here to own it.`
  ],
  fourth_outbound_templates: [
    `Subject: MUST BE SAME WITH THE FIRST OUTBOUNND

Hi,

Any thoughts on this?`
  ]
};

const STANDARD_KEYS = [
  { key: 'first_outbound_templates', label: 'First Outbound' },
  { key: 'second_outbound_templates', label: 'Second Outbound' },
  { key: 'third_outbound_templates', label: 'Third Outbound' },
  { key: 'fourth_outbound_templates', label: 'Fourth Outbound' }
];

export default function SalesLetterTemplatesTab() {
  const { user } = useAuth();
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({});

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/save-templates');
      if (!res.ok) {
        throw new Error(`Failed to fetch templates: ${res.statusText}`);
      }
      const data = await res.json();

      const loadedTemplates = data?.sales_letter_templates || {};
      const initializedSteps = [];

      // Load standard keys first to preserve default order
      STANDARD_KEYS.forEach(s => {
        const templates = loadedTemplates[s.key] || DEFAULT_TEMPLATES[s.key] || [];
        initializedSteps.push({
          key: s.key,
          label: s.label,
          templates: [...templates]
        });
      });

      // Load custom keys (if any exist)
      Object.keys(loadedTemplates).forEach(key => {
        if (!STANDARD_KEYS.some(s => s.key === key)) {
          const label = key
            .replace(/_templates$/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());

          initializedSteps.push({
            key,
            label: label,
            templates: [...(loadedTemplates[key] || [])]
          });
        }
      });

      setSteps(initializedSteps);

      // Expand first step by default
      if (initializedSteps.length > 0) {
        setExpandedSteps({ [initializedSteps[0].key]: true });
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      toast.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const output = {};

      // Basic validation: ensure keys are unique and non-empty
      const seenKeys = new Set();
      for (const step of steps) {
        const cleanedKey = step.key.trim().toLowerCase().replace(/\s+/g, '_');
        if (!cleanedKey) {
          toast.error('Outbound step keys cannot be empty.');
          setSaving(false);
          return;
        }
        if (seenKeys.has(cleanedKey)) {
          toast.error(`Duplicate step key detected: "${cleanedKey}"`);
          setSaving(false);
          return;
        }
        seenKeys.add(cleanedKey);
        output[cleanedKey] = step.templates.filter(t => t.trim() !== '');
      }

      const res = await fetch('/api/settings/save-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templates: output }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error || `Failed to save templates: ${res.statusText}`);
      }

      toast.success('Sales letter templates saved successfully!');
    } catch (err) {
      console.error('Error saving templates:', err);
      toast.error('Failed to save templates: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (key) => {
    setExpandedSteps(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addStep = () => {
    const stepIndex = steps.length + 1;
    const newKey = `step_${stepIndex}_outbound_templates`;
    const newLabel = `Step ${stepIndex} Outbound`;

    setSteps(prev => [
      ...prev,
      {
        key: newKey,
        label: newLabel,
        templates: ['']
      }
    ]);
    setExpandedSteps(prev => ({ ...prev, [newKey]: true }));
  };

  const deleteStep = (index) => {
    const stepToDelete = steps[index];
    if (window.confirm(`Are you sure you want to delete "${stepToDelete.label}" and all its templates?`)) {
      setSteps(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateStepLabel = (index, newLabel) => {
    const key = newLabel.toLowerCase().replace(/\s+/g, '_') + '_templates';
    setSteps(prev => prev.map((step, i) => {
      if (i === index) {
        return { ...step, label: newLabel, key };
      }
      return step;
    }));
  };

  const addTemplate = (stepIndex) => {
    setSteps(prev => prev.map((step, idx) => {
      if (idx === stepIndex) {
        return {
          ...step,
          templates: [...step.templates, '']
        };
      }
      return step;
    }));
  };

  const updateTemplate = (stepIndex, templateIndex, value) => {
    setSteps(prev => prev.map((step, idx) => {
      if (idx === stepIndex) {
        const updatedTemplates = [...step.templates];
        updatedTemplates[templateIndex] = value;
        return {
          ...step,
          templates: updatedTemplates
        };
      }
      return step;
    }));
  };

  const deleteTemplate = (stepIndex, templateIndex) => {
    setSteps(prev => prev.map((step, idx) => {
      if (idx === stepIndex) {
        return {
          ...step,
          templates: step.templates.filter((_, tIdx) => tIdx !== templateIndex)
        };
      }
      return step;
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Email Campaign Templates</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure custom text email templates for sequence steps. Use placeholder <code className="text-teal-600 font-mono bg-teal-50 px-1 rounded">{`{price}`}</code> for the offer price.
          </p>
        </div>
        <button
          onClick={addStep}
          className="px-4 py-2 text-sm font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <FiFolderPlus className="w-4 h-4" />
          Add Outbound Step
        </button>
      </div>

      <div className="space-y-4">
        {steps.map((step, stepIdx) => (
          <div key={step.key} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm hover:shadow transition-shadow">
            {/* Header Accordion */}
            <div
              onClick={() => toggleExpand(step.key)}
              className="px-5 py-4 flex items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100/75 transition-colors border-b border-gray-100"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <span className="flex-shrink-0 p-1.5 bg-teal-100 text-teal-700 rounded-lg">
                  <FiFileText className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={step.label}
                  onChange={(e) => updateStepLabel(stepIdx, e.target.value)}
                  className="font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-teal-500 focus:outline-none px-1 py-0.5 text-sm sm:text-base max-w-[250px]"
                />
                <span className="text-xs text-gray-400 font-mono hidden md:inline">({step.key})</span>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => deleteStep(stepIdx)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Outbound Step"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleExpand(step.key)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  {expandedSteps[step.key] ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Template Items */}
            {expandedSteps[step.key] && (
              <div className="p-5 space-y-4 bg-white">
                <div className="space-y-4">
                  {step.templates.map((template, tempIdx) => (
                    <div key={tempIdx} className="flex gap-4 items-start bg-gray-50/50 p-4 rounded-lg border border-gray-100">
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Variant {tempIdx + 1}
                          </span>
                          <button
                            onClick={() => deleteTemplate(stepIdx, tempIdx)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
                            title="Remove Variant"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                        <textarea
                          rows={6}
                          value={template}
                          onChange={(e) => updateTemplate(stepIdx, tempIdx, e.target.value)}
                          placeholder="Write email template body here..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-sans focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => addTemplate(stepIdx)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    <FiPlusCircle className="w-4 h-4" />
                    Add Template Variant
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>


      <div className="pt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Templates'}
        </button>
      </div>
    </div>
  );
}
