'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthProvider'
import AddDomainModal from './components/AddDomainModal'
import BulkAddModal from './components/BulkAddModal'
import EditDomainModal from './components/EditDomainModal'
import MarkAsSoldModal from './components/MarkAsSoldModal'
import PortfolioVisualization from './components/PortfolioVisualization'
import { supabase } from '../../lib/supabase'
import { 
  FaPlus, 
  FaTrash, 
  FaEdit, 
  FaCheck, 
  FaLink,
  FaCalendar,
  FaShoppingCart,
  FaGlobe,
  FaUpload,
  FaDownload,
  FaSearch,
  FaFilter,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaExternalLinkAlt,
  FaInfo,
  FaClock,
  FaCalendarAlt,
  FaSpinner,
  FaSync,
  FaExclamationTriangle,
  FaTimesCircle,
  FaQuestionCircle,
  FaCheckCircle,
  FaServer,
  FaHistory,
  FaChevronDown,
  FaChevronRight,
  FaCreditCard,
  FaFileAlt,
  FaNetworkWired,
  FaStore,
  FaUserTag,
  FaEllipsisH,
  FaCopy,
  FaDollarSign,
  FaChartBar,
  FaChartPie,
  FaChartLine
} from 'react-icons/fa'

/* -------------------------
   Enhanced Registrar Extraction (from API route)
------------------------- */
function extractRegistrarName(rdapData) {
  if (!rdapData?.entities) return null;

  const registrarEntity = rdapData.entities.find(e =>
    Array.isArray(e.roles) && e.roles.includes("registrar")
  );

  if (!registrarEntity?.vcardArray) return null;

  const vcard = registrarEntity.vcardArray[1];
  const fn = vcard?.find(item => item[0] === "fn");

  return fn?.[3] || null;
}

/* -------------------------
   Helper function to process RDAP data
------------------------- */
function processRDAPData(domainName, rdapData, isRegistered, registrar, errorMessage) {
  // Extract registration and expiration dates
  let registrationDate = null;
  let expirationDate = null;
  let lastChangedDate = null;
  let nameservers = [];

  if (rdapData) {
    // Extract dates from events
    if (rdapData.events) {
      const registrationEvent = rdapData.events.find(event => event.eventAction === 'registration');
      const expirationEvent = rdapData.events.find(event => event.eventAction === 'expiration');
      const lastChangedEvent = rdapData.events.find(event => event.eventAction === 'last changed');
      
      if (registrationEvent && registrationEvent.eventDate) {
        registrationDate = new Date(registrationEvent.eventDate).toISOString();
      }
      
      if (expirationEvent && expirationEvent.eventDate) {
        expirationDate = new Date(expirationEvent.eventDate).toISOString();
      }
      
      if (lastChangedEvent && lastChangedEvent.eventDate) {
        lastChangedDate = new Date(lastChangedEvent.eventDate).toISOString();
      }
    }

    // Fallback to direct dates
    if (!registrationDate && rdapData.registrationDate) {
      registrationDate = new Date(rdapData.registrationDate).toISOString();
    }
    
    if (!expirationDate && rdapData.expirationDate) {
      expirationDate = new Date(rdapData.expirationDate).toISOString();
    }
    
    if (!lastChangedDate && rdapData.lastChangedDate) {
      lastChangedDate = new Date(rdapData.lastChangedDate).toISOString();
    }

    // Extract nameservers
    nameservers = rdapData.nameservers?.map(ns => ns.ldhName) || [];
  }

  // Fallback registrar extraction if not already found
  let finalRegistrar = registrar || 'Unknown';
  if (rdapData && !finalRegistrar && rdapData.entities) {
    const registrarEntity = rdapData.entities.find(entity => 
      entity.roles && entity.roles.includes('registrar')
    );
    
    if (registrarEntity) {
      if (registrarEntity.vcardArray && registrarEntity.vcardArray[1]) {
        const vcard = registrarEntity.vcardArray[1];
        const orgEntry = vcard.find(entry => entry[0] === 'org');
        if (orgEntry && orgEntry[3]) {
          finalRegistrar = orgEntry[3];
        }
      }
      
      if (finalRegistrar === 'Unknown' && registrarEntity.publicId) {
        finalRegistrar = registrarEntity.publicId;
      }
      if (finalRegistrar === 'Unknown' && registrarEntity.name) {
        finalRegistrar = registrarEntity.name;
      }
    }
  }

  return {
    registrar: finalRegistrar,
    registrationDate,
    expirationDate,
    lastChangedDate,
    nameservers,
    isRegistered,
    lastChecked: new Date().toISOString(),
    error: errorMessage ? true : false,
    errorMessage: errorMessage || null,
    rdapData
  };
}

/* -------------------------
   Domain Check Function with Multiple Fallbacks
------------------------- */
const fetchDomainDetails = async (domainName) => {
  try {
    let rdapData = null;
    let isRegistered = null;
    let errorMessage = null;
    
    // Try rdap.org
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const rdapOrgRes = await fetch(`https://rdap.org/domain/${domainName}`, {
        headers: { "Accept": "application/json" },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (rdapOrgRes.status === 200) {
        rdapData = await rdapOrgRes.json();
        isRegistered = true;
      } else if (rdapOrgRes.status === 404) {
        isRegistered = false;
      } else if (rdapOrgRes.status === 429) {
        errorMessage = 'Rate limited by RDAP.org';
      }
    } catch (err) {
      console.log(`RDAP.org failed for ${domainName}:`, err.message);
    }

    // Fallback to bootstrap method
    if (!rdapData && isRegistered === null) {
      try {
        const tld = domainName.split('.').slice(1).join('.');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const bootstrapRes = await fetch('https://data.iana.org/rdap/dns.json', {
          headers: { "Cache-Control": "no-store" },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (bootstrapRes.ok) {
          const bootstrapData = await bootstrapRes.json();
          const services = bootstrapData.services;
          
          let baseUrl = null;
          for (const service of services) {
            if (service[0].includes(tld)) {
              baseUrl = service[1][0];
              break;
            }
          }
          
          if (baseUrl) {
            const registryController = new AbortController();
            const registryTimeoutId = setTimeout(() => registryController.abort(), 5000);
            
            const registryRes = await fetch(`${baseUrl}domain/${domainName}`, {
              signal: registryController.signal
            });
            
            clearTimeout(registryTimeoutId);
            
            if (registryRes.status === 200) {
              rdapData = await registryRes.json();
              isRegistered = true;
            } else if (registryRes.status === 404) {
              isRegistered = false;
            }
          }
        }
      } catch (err) {
        console.log(`Registry RDAP failed for ${domainName}:`, err.message);
      }
    }

    // Final fallback - simple DNS check
    if (isRegistered === null) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const dohRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${domainName}&type=A`, {
          headers: { 'Accept': 'application/dns-json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (dohRes.ok) {
          const dnsData = await dohRes.json();
          isRegistered = dnsData.Answer && dnsData.Answer.length > 0;
        }
      } catch (err) {
        console.log(`DNS check failed for ${domainName}:`, err.message);
      }
    }

    const registrar = rdapData ? extractRegistrarName(rdapData) : null;

    return processRDAPData(domainName, rdapData, isRegistered, registrar, errorMessage);

  } catch (err) {
    console.error(`Critical error fetching domain data for ${domainName}:`, err);
    return {
      registrar: null,
      registrationDate: null,
      expirationDate: null,
      lastChangedDate: null,
      nameservers: [],
      isRegistered: null,
      lastChecked: new Date().toISOString(),
      error: true,
      errorMessage: err.message
    };
  }
};

export default function PortfolioPage() {
  const { user } = useAuth()
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [editingDomain, setEditingDomain] = useState(null)
  const [sellingDomain, setSellingDomain] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: 'added_date', direction: 'desc' })
  const [refreshingDomains, setRefreshingDomains] = useState([])
  const [expandedDomains, setExpandedDomains] = useState({})
  const [showVisualization, setShowVisualization] = useState(false)

  const calculateDomainStatus = (rdapData, sold = false) => {
    // If sold, return sold status immediately
    if (sold) {
      return { status: 'sold', daysRemaining: null };
    }
    
    let daysRemaining = null;
    let status = 'active';
    
    if (rdapData.error) {
      status = 'error';
    } else if (rdapData.isRegistered === false) {
      status = 'available';
    } else if (rdapData.expirationDate) {
      const expDate = new Date(rdapData.expirationDate);
      const today = new Date();
      const diffTime = expDate - today;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysRemaining < 0) {
        status = 'expired';
      } else if (daysRemaining <= 30) {
        status = 'expiring';
      }
    } else if (rdapData.isRegistered === true) {
      status = 'active';
    } else {
      status = 'unknown';
    }

    return { status, daysRemaining };
  };

  const fetchDomains = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching domains:', error)
        return
      }
      
      const domainsWithRDAP = await Promise.all(data.map(async (domain) => {
        // Only fetch RDAP data if not sold and we don't have recent data
        const shouldFetchRDAP = !domain.sold || 
          !domain.last_checked || 
          new Date(domain.last_checked) < new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        let rdapData = {};
        if (shouldFetchRDAP) {
          rdapData = await fetchDomainDetails(domain.domain);
        } else {
          // Use existing data if available
          rdapData = {
            registrar: domain.registrar,
            registrationDate: domain.registration_date,
            expirationDate: domain.expiration_date,
            lastChangedDate: domain.last_changed_date,
            nameservers: domain.nameservers || [],
            isRegistered: domain.is_registered,
            error: domain.rdap_error,
            errorMessage: domain.rdap_error_message,
            lastChecked: domain.last_checked
          };
        }
        
        const result = calculateDomainStatus(rdapData, domain.sold);
        
        return {
          id: domain.id,
          name: domain.domain,
          added_date: domain.created_at,
          purchase_price: domain.purchase_price || 0,
          notes: domain.note || '',
          created_at: domain.created_at,
          updated_at: domain.updated_at,
          status: result.status,
          registrar: domain.sold ? domain.registrar : (rdapData.registrar || 'Unknown'),
          registration_date: domain.sold ? domain.registration_date : rdapData.registrationDate,
          expiration_date: domain.sold ? domain.expiration_date : rdapData.expirationDate,
          last_changed_date: domain.sold ? domain.last_changed_date : rdapData.lastChangedDate,
          nameservers: domain.sold ? (domain.nameservers || []) : (rdapData.nameservers || []),
          days_remaining: result.daysRemaining,
          is_registered: domain.sold ? domain.is_registered : rdapData.isRegistered,
          rdap_error: domain.sold ? domain.rdap_error : rdapData.error,
          rdap_error_message: domain.sold ? domain.rdap_error_message : rdapData.errorMessage,
          last_checked: rdapData.lastChecked || domain.last_checked || new Date().toISOString(),
          // Add sold-related fields
          sold: domain.sold || false,
          sale_price: domain.sale_price || null,
          sale_publicity: domain.sale_publicity || 'private',
          sale_date: domain.sale_date || null,
          loading: false,
          showDetails: false
        }
      }))
      
      setDomains(domainsWithRDAP)
    } catch (err) {
      console.error('Unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchDomains()
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('domains-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'domains',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchDomains()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const refreshDomainData = async (domainId) => {
    const domain = domains.find(d => d.id === domainId)
    if (!domain) return

    setRefreshingDomains(prev => [...prev, domainId])
    
    try {
      const freshData = await fetchDomainDetails(domain.name)
      const result = calculateDomainStatus(freshData, domain.sold)

      setDomains(prev => prev.map(d => 
        d.id === domainId 
          ? { 
              ...d, 
              registrar: freshData.registrar || 'Unknown',
              registration_date: freshData.registrationDate,
              expiration_date: freshData.expirationDate,
              last_changed_date: freshData.lastChangedDate,
              nameservers: freshData.nameservers,
              days_remaining: result.daysRemaining,
              status: result.status,
              is_registered: freshData.isRegistered,
              rdap_error: freshData.error,
              rdap_error_message: freshData.errorMessage,
              last_checked: freshData.lastChecked,
              loading: false
            }
          : d
      ))
    } catch (err) {
      console.error('Error refreshing domain data:', err)
    } finally {
      setRefreshingDomains(prev => prev.filter(id => id !== domainId))
    }
  }

  const refreshAllDomains = async () => {
    const domainsToRefresh = domains.filter(d => !refreshingDomains.includes(d.id) && !d.sold)
    if (domainsToRefresh.length === 0) return
    
    setRefreshingDomains(domainsToRefresh.map(d => d.id))
    
    const batchSize = 3
    const batches = []
    
    for (let i = 0; i < domainsToRefresh.length; i += batchSize) {
      batches.push(domainsToRefresh.slice(i, i + batchSize))
    }
    
    for (const batch of batches) {
      await Promise.all(batch.map(domain => refreshDomainData(domain.id)))
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    
    setRefreshingDomains([])
  }

  const bulkCheckStaleDomains = async () => {
    const staleDomains = domains.filter(d => {
      const lastChecked = d.last_checked ? new Date(d.last_checked).getTime() : 0
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
      return (d.rdap_error || !d.last_checked || lastChecked < twentyFourHoursAgo) && !d.sold
    })
    
    if (staleDomains.length === 0) {
      alert('All domains have fresh RDAP data')
      return
    }
    
    setRefreshingDomains(staleDomains.map(d => d.id))
    
    const batchSize = 3
    const batches = []
    
    for (let i = 0; i < staleDomains.length; i += batchSize) {
      batches.push(staleDomains.slice(i, i + batchSize))
    }
    
    for (const batch of batches) {
      await Promise.all(batch.map(domain => refreshDomainData(domain.id)))
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    
    setRefreshingDomains([])
    alert(`Refreshed ${staleDomains.length} stale domain(s)`)
  }

  const toggleAccordion = (domainId) => {
    setExpandedDomains(prev => ({
      ...prev,
      [domainId]: !prev[domainId]
    }))
  }

  const toggleAllAccordions = () => {
    const allExpanded = Object.values(expandedDomains).every(val => val === true)
    if (allExpanded) {
      setExpandedDomains({})
    } else {
      const newExpanded = {}
      domains.forEach(domain => {
        newExpanded[domain.id] = true
      })
      setExpandedDomains(newExpanded)
    }
  }

  const handleAddDomain = async (domainData) => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('domains')
        .insert({
          user_id: user.id,
          domain: domainData.name,
          purchase_price: domainData.purchasePrice || 0,
          note: domainData.notes || ''
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding domain:', error)
        alert('Failed to add domain. Please try again.')
        return
      }

      const rdapData = await fetchDomainDetails(domainData.name)
      const result = calculateDomainStatus(rdapData)

      const newDomain = {
        id: data.id,
        name: data.domain,
        added_date: data.created_at,
        purchase_price: data.purchase_price || 0,
        notes: data.note || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
        status: result.status,
        registrar: rdapData.registrar || 'Unknown',
        registration_date: rdapData.registrationDate,
        expiration_date: rdapData.expirationDate,
        last_changed_date: rdapData.lastChangedDate,
        nameservers: rdapData.nameservers,
        days_remaining: result.daysRemaining,
        is_registered: rdapData.isRegistered,
        rdap_error: rdapData.error,
        rdap_error_message: rdapData.errorMessage,
        last_checked: rdapData.lastChecked,
        sold: false,
        sale_price: null,
        sale_publicity: 'private',
        sale_date: null,
        loading: false,
        showDetails: false
      }

      setDomains([newDomain, ...domains])
      alert('Domain added successfully!')
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    }
  }

  const handleBulkAdd = async (domainList) => {
    if (!user) return
    
    try {
      const domainsToInsert = domainList.map(domain => ({
        user_id: user.id,
        domain: domain.name,
        purchase_price: parseFloat(domain.purchasePrice) || 0,
        note: 'Added via bulk import'
      }))

      const { data, error } = await supabase
        .from('domains')
        .insert(domainsToInsert)
        .select()

      if (error) {
        console.error('Error bulk adding domains:', error)
        alert('Failed to add domains. Please try again.')
        return
      }

      const newDomains = await Promise.all(data.map(async (domain) => {
        const rdapData = await fetchDomainDetails(domain.domain)
        const result = calculateDomainStatus(rdapData);

        return {
          id: domain.id,
          name: domain.domain,
          added_date: domain.created_at,
          purchase_price: domain.purchase_price || 0,
          notes: domain.note || '',
          created_at: domain.created_at,
          updated_at: domain.updated_at,
          status: result.status,
          registrar: rdapData.registrar || 'Unknown',
          registration_date: rdapData.registrationDate,
          expiration_date: rdapData.expirationDate,
          last_changed_date: rdapData.lastChangedDate,
          nameservers: rdapData.nameservers,
          days_remaining: result.daysRemaining,
          is_registered: rdapData.isRegistered,
          rdap_error: rdapData.error,
          rdap_error_message: rdapData.errorMessage,
          last_checked: rdapData.lastChecked,
          sold: false,
          sale_price: null,
          sale_publicity: 'private',
          sale_date: null,
          loading: false,
          showDetails: false
        }
      }))

      setDomains([...newDomains, ...domains])
      alert(`Successfully added ${newDomains.length} domain(s)`)
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    }
  }

  const handleEditDomain = (domain) => {
    setEditingDomain(domain)
  }

  const handleUpdateDomain = async (updatedDomainData) => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('domains')
        .update({
          domain: updatedDomainData.name,
          purchase_price: updatedDomainData.purchase_price || 0,
          note: updatedDomainData.notes || ''
        })
        .eq('id', updatedDomainData.id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating domain:', error)
        alert('Failed to update domain. Please try again.')
        return
      }

      setDomains(domains.map(domain => 
        domain.id === updatedDomainData.id 
          ? { 
              ...domain, 
              name: updatedDomainData.name,
              purchase_price: updatedDomainData.purchase_price || 0,
              notes: updatedDomainData.notes || '',
              updated_at: new Date().toISOString() 
            }
          : domain
      ))
      
      alert('Domain updated successfully!')
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    }
  }

  const handleMarkAsSold = async ({ domainId, salePrice, shareSaleReport }) => {
    if (!user) return
    
    try {
      // Get current domain data to preserve RDAP info
      const domain = domains.find(d => d.id === domainId);
      
      // Update the domain in Supabase
      const { error } = await supabase
        .from('domains')
        .update({
          sold: true,
          sale_price: salePrice,
          sale_publicity: shareSaleReport ? 'public' : 'private',
          sale_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
         
        })
        .eq('id', domainId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error marking domain as sold:', error)
        alert('Failed to mark domain as sold. Please try again.')
        throw error
      }

      // Update local state
      setDomains(domains.map(d => 
        d.id === domainId 
          ? { 
              ...d, 
              sold: true,
              sale_price: salePrice,
              sale_publicity: shareSaleReport ? 'public' : 'private',
              sale_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              // Update status to sold
              status: 'sold'
            }
          : d
      ))

      // Close the modal
      setSellingDomain(null)
      alert('Domain marked as sold successfully!')
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
      throw err
    }
  }

  const handleDeleteDomain = async (domainId) => {
    if (!confirm('Are you sure you want to delete this domain?')) return
    
    if (!user) return
    
    try {
      const { error } = await supabase
        .from('domains')
        .delete()
        .eq('id', domainId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting domain:', error)
        alert('Failed to delete domain. Please try again.')
        return
      }

      setDomains(domains.filter(domain => domain.id !== domainId))
      alert('Domain deleted successfully!')
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    }
  }

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <FaSort className="inline ml-1 text-gray-400" />
    }
    return sortConfig.direction === 'asc' 
      ? <FaSortUp className="inline ml-1 text-teal-600" />
      : <FaSortDown className="inline ml-1 text-teal-600" />
  }

  const sortedAndFilteredDomains = domains
    .filter(domain => {
      const matchesSearch = domain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (domain.notes && domain.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (domain.registrar && domain.registrar.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (domain.nameservers && domain.nameservers.some(ns => ns.toLowerCase().includes(searchTerm.toLowerCase())))
      const matchesStatus = statusFilter === 'all' || domain.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortConfig.key === 'name' || sortConfig.key === 'status' || sortConfig.key === 'registrar') {
        return sortConfig.direction === 'asc'
          ? (a[sortConfig.key] || '').localeCompare(b[sortConfig.key] || '')
          : (b[sortConfig.key] || '').localeCompare(a[sortConfig.key] || '')
      } else if (sortConfig.key === 'purchase_price') {
        return sortConfig.direction === 'asc'
          ? (a.purchase_price || 0) - (b.purchase_price || 0)
          : (b.purchase_price || 0) - (a.purchase_price || 0)
      } else if (sortConfig.key === 'sale_price') {
        return sortConfig.direction === 'asc'
          ? (a.sale_price || 0) - (b.sale_price || 0)
          : (b.sale_price || 0) - (a.sale_price || 0)
      } else if (sortConfig.key === 'days_remaining') {
        return sortConfig.direction === 'asc'
          ? (a.days_remaining || 9999) - (b.days_remaining || 9999)
          : (b.days_remaining || 9999) - (a.days_remaining || 9999)
      } else {
        const dateA = a[sortConfig.key] ? new Date(a[sortConfig.key]) : new Date(0)
        const dateB = b[sortConfig.key] ? new Date(b[sortConfig.key]) : new Date(0)
        return sortConfig.direction === 'asc'
          ? dateA - dateB
          : dateB - dateA
      }
    })

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'available': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'parked': return 'bg-purple-100 text-purple-800'
      case 'expiring': return 'bg-orange-100 text-orange-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'sold': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRDAPStatusIcon = (domain) => {
    if (domain.rdap_error) {
      return <FaExclamationTriangle className="h-4 w-4 text-red-500" />
    }
    if (domain.is_registered === false) {
      return <FaCheckCircle className="h-4 w-4 text-green-500" />
    }
    if (domain.is_registered === true) {
      return <FaCheckCircle className="h-4 w-4 text-blue-500" />
    }
    return <FaQuestionCircle className="h-4 w-4 text-gray-400" />
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDaysRemainingBadge = (days) => {
    if (days === null || days === undefined) return null
    
    if (days < 0) {
      return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">Expired</span>
    } else if (days <= 7) {
      return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">{days} days</span>
    } else if (days <= 30) {
      return <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">{days} days</span>
    } else if (days <= 90) {
      return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">{days} days</span>
    } else {
      return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">{days} days</span>
    }
  }

  const getRegistrarIcon = (registrar) => {
    if (!registrar) return null
    
    const registrarLower = registrar.toLowerCase()
    if (registrarLower.includes('godaddy')) return '👑'
    if (registrarLower.includes('namecheap')) return '💰'
    if (registrarLower.includes('google')) return '🔍'
    if (registrarLower.includes('cloudflare')) return '☁️'
    if (registrarLower.includes('name.com')) return '🏷️'
    return '🏢'
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Domain copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  // Calculate stats
  const totalDomains = domains.length
  const activeDomains = domains.filter(d => d.status === 'active' || d.status === 'expiring').length
  const expiredDomains = domains.filter(d => d.status === 'expired').length
  const availableDomains = domains.filter(d => d.status === 'available').length
  const soldDomains = domains.filter(d => d.status === 'sold').length
  const errorDomains = domains.filter(d => d.status === 'error').length
  const totalInvestment = domains.reduce((sum, domain) => sum + (domain.purchase_price || 0), 0)
  const totalSales = domains.filter(d => d.sold).reduce((sum, domain) => sum + (domain.sale_price || 0), 0)
  const expiringSoonDomains = domains.filter(d => d.days_remaining !== null && d.days_remaining <= 30 && d.days_remaining > 0 && !d.sold).length
  const staleRDAPDomains = domains.filter(d => {
    if (!d.last_checked || d.sold) return false
    const lastChecked = new Date(d.last_checked).getTime()
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
    return lastChecked < twentyFourHoursAgo
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FaSpinner className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your domains...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* <div>
          <h2 className="text-xl font-bold text-gray-800">Domain Portfolio</h2>
          <p className="text-gray-600">Manage your domain investments</p>
        </div> */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          >
            <FaPlus className="mr-2" />
            Add Domain
          </button>
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-white text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
          >
            <FaUpload className="mr-2" />
            Bulk Add
          </button>
          <button
            onClick={() => setShowVisualization(!showVisualization)}
            className={`inline-flex items-center px-4 py-2 border rounded-lg transition-colors ${
              showVisualization 
                ? 'bg-teal-100 text-teal-700 border-teal-300' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FaChartBar className="mr-2" />
            {showVisualization ? 'Hide Visualization' : 'Visualize Portfolio'}
          </button>
          <button
            onClick={refreshAllDomains}
            disabled={refreshingDomains.length > 0}
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {refreshingDomains.length > 0 ? (
              <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FaSync className="mr-2" />
            )}
            Refresh All
          </button>
        </div>
      </div>

      {/* Visualization Section */}
      {showVisualization && (
        <PortfolioVisualization domains={domains} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Domains</p>
              <p className="text-2xl font-bold text-gray-800">{totalDomains}</p>
            </div>
            <div className="p-2 bg-teal-50 rounded-lg">
              <FaGlobe className="h-5 w-5 text-teal-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-800">{activeDomains}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <FaCheck className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Investment</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalInvestment)}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <FaShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sold</p>
              <p className="text-2xl font-bold text-gray-800">{soldDomains}</p>
              <p className="text-xs text-gray-500 mt-1">{formatCurrency(totalSales)}</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <FaDollarSign className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-800">{expiringSoonDomains}</p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <FaClock className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Available</p>
              <p className="text-2xl font-bold text-gray-800">{availableDomains}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <FaCheckCircle className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Errors</p>
              <p className="text-2xl font-bold text-gray-800">{errorDomains}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <FaExclamationTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search domains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="available">Available</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="sold">Sold</option>
          </select>
          <button
            onClick={() => {
              const csvContent = domains.map(domain => 
                `${domain.name},${domain.registrar || 'Unknown'},${formatDate(domain.registration_date)},${formatDate(domain.expiration_date)},${domain.days_remaining || 'N/A'},${domain.purchase_price || 0},${domain.sale_price || ''},${domain.sold ? 'Sold' : 'Not Sold'},${domain.notes || ''}`
              ).join('\n')
              const blob = new Blob([`Domain,Registrar,Registration,Expiration,Days Remaining,Purchase Price,Sale Price,Status,Notes\n${csvContent}`], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'domains.csv'
              a.click()
            }}
            className="inline-flex items-center px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FaDownload className="mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Domains List */}
      <div className="space-y-3">
        {sortedAndFilteredDomains.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FaGlobe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No domains found</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 text-teal-600 hover:text-teal-700 font-medium"
            >
              Add your first domain
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedAndFilteredDomains.map((domain) => {
              const isRefreshing = refreshingDomains.includes(domain.id)
              const isExpanded = expandedDomains[domain.id]
              
              return (
                <div key={domain.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300">
                  {/* Domain Summary */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FaLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="flex items-center min-w-0">
                            <h3 
                              className="font-medium text-lg text-gray-900 truncate hover:text-teal-600"
                              title={domain.name}
                            >
                              {domain.name}
                            </h3>
                            <button
                              onClick={() => copyToClipboard(domain.name)}
                              className="ml-2 text-gray-400 hover:text-teal-600"
                              title="Copy domain"
                            >
                              <FaCopy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Mobile-only status and days info BELOW domain name */}
                        <div className="flex flex-wrap items-center gap-2 lg:hidden">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(domain.status)}`}>
                            {domain.status.charAt(0).toUpperCase() + domain.status.slice(1)}
                          </span>
                          {getDaysRemainingBadge(domain.days_remaining)}
                          <div className="flex items-center text-xs text-gray-600">
                            <span className="mr-1">{getRegistrarIcon(domain.registrar)}</span>
                            <span className="truncate max-w-[100px]" title={domain.registrar}>
                              {domain.registrar || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Desktop-only info (right side) */}
                      <div className="hidden lg:flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(domain.status)}`}>
                          {domain.status.charAt(0).toUpperCase() + domain.status.slice(1)}
                        </span>
                        {getDaysRemainingBadge(domain.days_remaining)}
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-1">{getRegistrarIcon(domain.registrar)}</span>
                          <span className="max-w-[120px] truncate" title={domain.registrar}>
                            {domain.registrar || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom row - common for both mobile and desktop */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          <FaCreditCard className="h-3 w-3 mr-1" />
                          <span>{formatCurrency(domain.purchase_price)}</span>
                        </div>
                        {domain.sold && domain.sale_price && (
                          <div className="flex items-center text-purple-600 font-medium">
                            <FaDollarSign className="h-3 w-3 mr-1" />
                            <span>Sold: {formatCurrency(domain.sale_price)}</span>
                          </div>
                        )}
                        {domain.expiration_date && !domain.sold && (
                          <div className="flex items-center">
                            <FaCalendarAlt className="h-3 w-3 mr-1" />
                            <span>Exp: {formatDate(domain.expiration_date)}</span>
                          </div>
                        )}
                        {domain.rdap_error ? (
                          <div className="flex items-center text-red-600">
                            <FaExclamationTriangle className="h-3 w-3 mr-1" />
                            <span className="text-xs">Error</span>
                          </div>
                        ) : domain.sold ? (
                          <div className="flex items-center text-purple-600">
                            <FaCheckCircle className="h-3 w-3 mr-1" />
                            <span className="text-xs">Sold</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-green-600">
                            <FaCheckCircle className="h-3 w-3 mr-1" />
                            <span className="text-xs">{domain.is_registered ? 'Registered' : 'Available'}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAccordion(domain.id)}
                          className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-teal-600"
                        >
                          {isExpanded ? (
                            <>
                              <FaChevronDown className="h-3 w-3 mr-1" />
                              Less
                            </>
                          ) : (
                            <>
                              <FaChevronRight className="h-3 w-3 mr-1" />
                              Details
                            </>
                          )}
                        </button>
                        {!domain.sold && (
                          <button
                            onClick={() => refreshDomainData(domain.id)}
                            disabled={isRefreshing}
                            className="inline-flex items-center px-2 py-1 text-sm text-gray-600 hover:text-teal-600 disabled:opacity-50"
                            title="Refresh RDAP"
                          >
                            {isRefreshing ? (
                              <FaSpinner className="h-3 w-3 animate-spin" />
                            ) : (
                              <FaSync className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Domain Info */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-700">Domain Details</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Status:</span>
                              <span className={`font-medium ${getStatusBadgeClass(domain.status).replace('bg-', 'text-')}`}>
                                {domain.status}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Registrar:</span>
                              <span className="font-medium text-gray-900">
                                {domain.registrar || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Purchase Price:</span>
                              <span className="font-medium text-gray-900">{formatCurrency(domain.purchase_price)}</span>
                            </div>
                            {domain.sold && domain.sale_price && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Sale Price:</span>
                                <span className="font-medium text-purple-900">{formatCurrency(domain.sale_price)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Added:</span>
                              <span className="font-medium text-gray-900">{formatDate(domain.added_date)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Registration Info */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-700">Registration</h4>
                          <div className="space-y-2">
                            {!domain.sold && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Registered:</span>
                                  <span className="font-medium text-gray-900">{formatDate(domain.registration_date)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Expires:</span>
                                  <span className="font-medium text-gray-900">{formatDate(domain.expiration_date)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Days Left:</span>
                                  <span className="font-medium">
                                    {domain.days_remaining !== null ? (
                                      <span className={`px-2 py-1 rounded-full text-xs ${getDaysRemainingBadge(domain.days_remaining)?.props.className}`}>
                                        {domain.days_remaining} days
                                      </span>
                                    ) : 'N/A'}
                                  </span>
                                </div>
                              </>
                            )}
                            {domain.sold && domain.sale_date && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Sold On:</span>
                                <span className="font-medium text-gray-900">{formatDate(domain.sale_date)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Last Checked:</span>
                              <span className="font-medium text-gray-900">{formatDateTime(domain.last_checked)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions and Notes */}
                        <div className="md:col-span-2 space-y-3">
                          {domain.notes && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-2">Notes</h4>
                              <div className="bg-white rounded border border-gray-200 p-3">
                                <p className="text-gray-700 text-sm">{domain.notes}</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-gray-300">
                            <div className="flex items-center gap-3">
                              <a
                                href={`https://${domain.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                <FaExternalLinkAlt className="h-4 w-4 mr-2" />
                                Visit
                              </a>
                              <button
                                onClick={() => copyToClipboard(domain.name)}
                                className="inline-flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                <FaCopy className="h-4 w-4 mr-2" />
                                Copy
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-3 sm:mt-0">
                              {!domain.sold && (
                                <button
                                  onClick={() => setSellingDomain(domain)}
                                  className="inline-flex items-center px-3 py-2 text-sm text-purple-600 hover:text-purple-900 bg-white border border-purple-200 rounded-lg hover:bg-purple-50"
                                >
                                  <FaDollarSign className="h-4 w-4 mr-2" />
                                  Mark as Sold
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleEditDomain(domain)}
                                className="inline-flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-900 bg-white border border-blue-200 rounded-lg hover:bg-blue-50"
                              >
                                <FaEdit className="h-4 w-4 mr-2" />
                                Edit
                              </button>
                              
                              <button
                                onClick={() => handleDeleteDomain(domain.id)}
                                className="inline-flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-900 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                              >
                                <FaTrash className="h-4 w-4 mr-2" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddDomainModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddDomain={handleAddDomain}
      />

      <BulkAddModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onBulkAdd={handleBulkAdd}
      />

      <EditDomainModal
        domain={editingDomain}
        isOpen={!!editingDomain}
        onClose={() => setEditingDomain(null)}
        onUpdateDomain={handleUpdateDomain}
      />

      <MarkAsSoldModal
        domain={sellingDomain}
        isOpen={!!sellingDomain}
        onClose={() => setSellingDomain(null)}
        onMarkAsSold={handleMarkAsSold}
      />
    </div>
  )
}