import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { familyAPI, documentAPI } from '../api';
import MemberDocUpload from './DocumentUploadModal';

export default function CitizenDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [eligibleSchemes, setEligibleSchemes] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'schemes'

  // Modal states
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [showVerifyMember, setShowVerifyMember] = useState(false);
  const [showEditFamily, setShowEditFamily] = useState(false);
  const [docMember, setDocMember] = useState(null); // member to show doc popup for
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Forms
  const [memberForm, setMemberForm] = useState({
    citizen_id: '', full_name: '', aadhaar_id: '', date_of_birth: '', gender: '',
    occupation: '', annual_income: '', relationship: '', relationship_custom: '',
  });

  const [verifyForm, setVerifyForm] = useState({ citizen_id: '', name: '', otp: '' });

  const [familyForm, setFamilyForm] = useState({
    current_address: '', district: '', ration_card_no: '',
  });

  const [documents, setDocuments] = useState([]);
  const [mandatoryDocsComplete, setMandatoryDocsComplete] = useState(false);

  // Declaration & UI State
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchFamilyData();
    fetchDocuments();
  }, []);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      const res = await familyAPI.getFamily();
      setFamily(res.data);
      setMembers(res.data.citizens || []);
      setFamilyForm({
        current_address: res.data.current_address || '',
        district: res.data.district || '',
        state: res.data.state || '',
        ration_card_no: res.data.ration_card_no || '',
      });

      // Fetch eligible schemes if active
      if (res.data.status === 'ACTIVE') {
        try {
          const schemesRes = await familyAPI.getEligibleSchemes();
          setEligibleSchemes(schemesRes.data);
        } catch (schemeErr) {
          console.error("Failed to fetch schemes", schemeErr);
        }
      }
    } catch (err) {
      setError('Failed to load family data.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const fetchDocuments = async () => {
    try {
      const res = await documentAPI.getDocuments();
      setDocuments(res.data);
      // Check mandatory docs: every member must have AADHAAR uploaded
      checkMandatoryDocs(res.data);
    } catch (err) {
      // Silently fail — docs aren't loaded yet
    }
  };

  const checkMandatoryDocs = (docs) => {
    // Every member needs AADHAAR + CASTE_CERTIFICATE + relationship-specific docs
    const allComplete = members.length > 0 && members.every(m => {
      const memberDocs = docs.filter(d => d.citizen_id === m.citizen_id);
      const hasAadhaar = memberDocs.some(d => d.document.document_type === 'AADHAAR');
      const hasCaste = memberDocs.some(d => d.document.document_type === 'CASTE_CERTIFICATE');

      // Relationship-based mandatory docs
      let hasRelDoc = true;
      const rel = (m.relationship || '').toLowerCase();
      if (!m.is_head_of_family) {
        if (rel === 'spouse') {
          hasRelDoc = memberDocs.some(d => d.document.document_type === 'MARRIAGE_CERTIFICATE');
        } else if (rel === 'child' || rel === 'son' || rel === 'daughter') {
          hasRelDoc = memberDocs.some(d => d.document.document_type === 'BIRTH_CERTIFICATE');
        } else if (rel === 'adopted_child') {
          hasRelDoc = memberDocs.some(d => d.document.document_type === 'ADOPTION_DEED');
        }
      }

      return hasAadhaar && hasCaste && hasRelDoc;
    });
    setMandatoryDocsComplete(allComplete);
  };

  // Re-check mandatory docs when members change
  useEffect(() => {
    if (documents.length > 0) {
      checkMandatoryDocs(documents);
    }
  }, [members, documents]);

  // Add / Edit Member Handlers
  const handleSaveMember = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (showEditMember) {
        await familyAPI.editMember(memberForm.citizen_id, memberForm);
        setSuccessMsg('Family member updated successfully!');
      } else {
        await familyAPI.addMember(memberForm);
        setSuccessMsg('Family member added successfully! Please verify their Aadhaar.');
      }
      setShowAddMember(false);
      setShowEditMember(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchFamilyData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save member.');
    }
  };

  const openAddMember = () => {
    setMemberForm({
      citizen_id: '', full_name: '', aadhaar_id: '', date_of_birth: '', gender: '',
      occupation: '', annual_income: '', relationship: '', relationship_custom: '', caste: '',
    });
    setShowAddMember(true);
  };

  const openEditMember = (m) => {
    setMemberForm({
      citizen_id: m.citizen_id,
      full_name: m.full_name,
      aadhaar_id: m.aadhaar_id,
      date_of_birth: m.date_of_birth ? m.date_of_birth.split('T')[0] : '',
      gender: m.gender || '',
      occupation: m.occupation || '',
      annual_income: m.annual_income || '',
      relationship: m.is_head_of_family ? 'head' : (m.relationship || ''),
      relationship_custom: m.relationship_custom || '',
      caste: m.caste || '',
    });
    setShowEditMember(true);
  };

  const handleRemoveMember = (citizenId, name) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Family Member',
      message: `Are you sure you want to remove ${name} from the family?`,
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        try {
          await familyAPI.removeMember(citizenId);
          setSuccessMsg(`${name} has been removed.`);
          setTimeout(() => setSuccessMsg(''), 3000);
          fetchFamilyData();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to remove member.');
        }
      }
    });
  };

  // Verify Aadhaar Handler
  const handleVerifyMember = async (e) => {
    e.preventDefault();
    setError('');
    if (verifyForm.otp !== '123456') {
      setError('Invalid OTP. For prototype, please use 123456');
      return;
    }
    try {
      await familyAPI.verifyMember(verifyForm.citizen_id, verifyForm.otp);
      setSuccessMsg(`${verifyForm.name}'s Aadhaar verified successfully!`);
      setShowVerifyMember(false);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchFamilyData();
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    }
  };

  const handleUpdateFamily = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await familyAPI.updateFamily(familyForm);
      setShowEditFamily(false);
      setSuccessMsg('Family details updated!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchFamilyData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update family.');
    }
  };

  const handleMakeHead = (citizenId, name) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Change Head of Family',
      message: `Are you sure you want to make ${name} the new Head of the Family?`,
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        setError('');
        try {
          const res = await familyAPI.makeHead(citizenId);
          setSuccessMsg(res.data.message);
          fetchFamilyData();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to update Head of Family.');
        }
      }
    });
  };

  const handleSubmitApplication = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Submit Application',
      message: 'Are you sure you want to submit your application? You will not be able to edit after submission.',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        setError('');
        try {
          const res = await familyAPI.submitApplication();
          setSuccessMsg(res.data.message);
          fetchFamilyData();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to submit application.');
        }
      }
    });
  };

  const handleUnsubmitApplication = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Unsubmit Application',
      message: 'Are you sure you want to unsubmit? This will cancel your verification process and allow you to make changes.',
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false });
        setError('');
        try {
          const res = await familyAPI.unsubmitApplication();
          setSuccessMsg(res.data.message);
          fetchFamilyData();
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to unsubmit application.');
        }
      }
    });
  };

  const getStatusClass = (status) => {
    const map = {
      'DRAFT': 'draft',
      'PENDING_VERIFICATION': 'pending',
      'ACTIVE': 'active',
      'REJECTED': 'rejected',
    };
    return map[status] || 'draft';
  };

  const getStatusLabel = (status) => {
    const map = {
      'DRAFT': '📝 Draft',
      'PENDING_VERIFICATION': '⏳ Pending Verification',
      'ACTIVE': '✅ Active',
      'REJECTED': '❌ Rejected',
    };
    return map[status] || status;
  };

  // Derived state for submission guards
  const allVerified = members.length > 0 && members.every(m => m.is_aadhaar_verified);
  const canSubmit = family?.status === 'DRAFT' && allVerified && mandatoryDocsComplete && declarationAccepted;

  if (loading) {
    return (
      <>
        <div className="tricolor-strip" />
        <div className="bg-animated" />
        <div className="auth-container">
          <div className="spinner spinner-dark" style={{ width: 40, height: 40, borderWidth: 3 }} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="tricolor-strip" />
      <div className="bg-animated" />
      <div className="dashboard">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <div className="header-icon">🏛️</div>
            <div>
              <h2><span>Parivar</span> Pehchaan Patra</h2>
            </div>
            <div className="india-flag" style={{ marginLeft: '0.25rem' }}>
              <div className="saffron-band" />
              <div className="white-band" />
              <div className="green-band" />
            </div>
          </div>
          <div className="dashboard-header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="dashboard-user-info">
              <div className="name">👤 {user?.full_name}</div>
              <div className="role">{user?.role} • Citizen Portal</div>
            </div>
            <button 
              onClick={handleLogout}
              style={{
                padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer',
                background: 'none', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-md)',
                color: 'var(--gray-600)', fontWeight: 500, transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.target.style.background = '#fee2e2'; e.target.style.borderColor = '#fca5a5'; e.target.style.color = '#dc2626'; }}
              onMouseLeave={(e) => { e.target.style.background = 'none'; e.target.style.borderColor = 'var(--gray-300)'; e.target.style.color = 'var(--gray-600)'; }}
            >
              🚪 Sign Out
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="dashboard-content">
          {family?.status === 'ACTIVE' && (
            <div style={{ display: 'flex', gap: '2rem', borderBottom: '2px solid var(--gray-200)', marginBottom: '2rem' }}>
              <button 
                onClick={() => setActiveTab('dashboard')}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 0.5rem 0.75rem 0.5rem',
                  fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                  color: activeTab === 'dashboard' ? 'var(--primary-color)' : 'var(--gray-500)',
                  borderBottom: activeTab === 'dashboard' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  marginBottom: '-2px', transition: 'all 0.2s'
                }}
              >
                🏠 Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('schemes')}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 0.5rem 0.75rem 0.5rem',
                  fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                  color: activeTab === 'schemes' ? 'var(--primary-color)' : 'var(--gray-500)',
                  borderBottom: activeTab === 'schemes' ? '3px solid var(--primary-color)' : '3px solid transparent',
                  marginBottom: '-2px', transition: 'all 0.2s'
                }}
              >
                🎁 Welfare Schemes
              </button>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          {family?.status === 'PENDING_VERIFICATION' && (
            <div className="alert alert-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <strong>Application Submitted!</strong> Your application (App ID: {family.tracking_number}) is currently under review by a Verification Officer.
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#fff' }}
                  onClick={handleUnsubmitApplication}>
                  ↩️ Unsubmit
                </button>
              </div>
            </div>
          )}

          {family?.status === 'ACTIVE' && (
            <div className="alert alert-success" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', marginBottom: '1.5rem' }}>
              <strong>🎉 Congratulations!</strong> Your family has been verified. Your official Parivar Pehchaan Patra (Family ID) is <strong>{family.family_id_number?.replace(/(.{4})/g, '$1 ').trim()}</strong>.
            </div>
          )}

          {/* --- Dashboard Tab Content --- */}
          {activeTab === 'dashboard' && (
            <>
              {/* Application Status Card */}
              <div className="card-grid">
                <div className="card card-accent">
              <div className="card-header">
                <h3>📋 Application Status</h3>
                <span className={`status-badge ${getStatusClass(family?.status)}`}>
                  {getStatusLabel(family?.status)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-key">Application No</span>
                <span className="info-value" style={{ fontFamily: 'monospace', color: '#ea580c', letterSpacing: '0.05em' }}>
                  {family?.tracking_number}
                </span>
              </div>
              <div className="info-row">
                <span className="info-key">Official Family ID</span>
                <span className="info-value" style={{ fontFamily: 'monospace', color: family?.family_id_number ? '#138808' : '#9ca3af', fontWeight: 700, fontSize: '1rem' }}>
                  {family?.family_id_number ? family.family_id_number : '--'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-key">Total Members</span>
                <span className="info-value">{members.length}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Household Income</span>
                <span className="info-value">
                  {family?.household_total_income
                    ? `₹${parseFloat(family.household_total_income).toLocaleString('en-IN')}`
                    : '— Not calculated —'}
                </span>
              </div>
            </div>

            <div className="card card-accent">
              <div className="card-header">
                <h3>🏠 Family Address</h3>
                {family?.status === 'DRAFT' && (
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    onClick={() => setShowEditFamily(true)}>
                    ✏️ Edit
                  </button>
                )}
              </div>
              <div className="info-row">
                <span className="info-key">Address</span>
                <span className="info-value">{family?.current_address || '— Not set —'}</span>
              </div>
              <div className="info-row">
                <span className="info-key">District</span>
                <span className="info-value">{family?.district || '— Not set —'}</span>
              </div>
              <div className="info-row">
                <span className="info-key">State</span>
                <span className="info-value">{family?.state || '— Not set —'}</span>
              </div>
                <div className="info-row">
                  <span className="info-key">Ration Card</span>
                  <span className="info-value">{family?.ration_card_no || '— Not provided —'}</span>
                </div>
              </div>
            </div>

          {/* Family Members */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3>👨‍👩‍👧‍👦 Family Members ({members.length})</h3>
              {family?.status === 'DRAFT' && (
                <button className="btn btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  onClick={openAddMember}>
                  + Add Member
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relation</th>
                    <th>Aadhaar</th>
                    <th>Gender</th>
                    <th>Income</th>
                    <th>Aadhaar Status</th>
                    <th>Docs</th>
                    {family?.status === 'DRAFT' && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const memberDocCount = documents.filter(d => d.citizen_id === m.citizen_id).length;
                    const hasAadhaarDoc = documents.some(d => d.citizen_id === m.citizen_id && d.document.document_type === 'AADHAAR');
                    const relationLabel = m.is_head_of_family ? 'Self (Head)' : (m.relationship_custom || m.relationship || '—');
                    return (
                      <tr key={m.citizen_id}>
                        <td>
                          {m.full_name}
                          {m.is_head_of_family && <span className="head-badge">HEAD</span>}
                        </td>
                        <td style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{relationLabel}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {m.aadhaar_id.replace(/(.{4})/g, '$1 ').trim()}
                        </td>
                        <td>{m.gender || '—'}</td>
                        <td>{m.annual_income ? `₹${parseFloat(m.annual_income).toLocaleString('en-IN')}` : '—'}</td>
                        <td>
                          {m.is_aadhaar_verified ? (
                            <span style={{ color: '#166534', fontWeight: 600, fontSize: '0.8rem' }}>✅ Verified</span>
                          ) : (
                            <span style={{ color: '#991b1b', fontWeight: 600, fontSize: '0.8rem' }}>❌ Pending</span>
                          )}
                        </td>
                        <td>
                          <button
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.2rem 0.5rem', border: `1.5px solid ${hasAadhaarDoc ? '#bbf7d0' : '#fecaca'}`,
                              borderRadius: 'var(--radius-md)', background: hasAadhaarDoc ? '#f0fdf4' : '#fef2f2',
                              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                              color: hasAadhaarDoc ? '#166534' : '#991b1b',
                            }}
                            onClick={() => setDocMember(m)}
                          >
                            📄 {memberDocCount}
                          </button>
                        </td>
                        {family?.status === 'DRAFT' && (
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {!m.is_aadhaar_verified && (
                                <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setVerifyForm({ citizen_id: m.citizen_id, name: m.full_name, otp: '' });
                                    setShowVerifyMember(true);
                                  }}>
                                  🔐 Verify
                                </button>
                              )}
                              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => openEditMember(m)}>
                                ✏️ Edit
                              </button>
                              {!m.is_head_of_family && (
                                <>
                                  <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#eab308' }}
                                    onClick={() => handleMakeHead(m.citizen_id, m.full_name)}>
                                    👑 Make Head
                                  </button>
                                  <button className="btn btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                    onClick={() => handleRemoveMember(m.citizen_id, m.full_name)}>
                                    🗑️
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Document Status Summary */}
          {family?.status === 'DRAFT' && (
            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: `4px solid ${mandatoryDocsComplete ? '#22c55e' : '#ef4444'}` }}>
              <div className="card-header" style={{ marginBottom: '0.3rem' }}>
                <h3>📄 Document Status</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>
                Click the <strong>📄</strong> icon next to each member in the table to upload their documents.
                Aadhaar Card Copy is mandatory for each member. You can also add custom documents (PAN Card, Driving License, etc.).
              </p>
              {mandatoryDocsComplete ? (
                <div style={{ color: '#166534', fontSize: '0.85rem', fontWeight: 600 }}>✅ All mandatory documents uploaded.</div>
              ) : (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>❌ Mandatory documents are pending. Please upload Aadhaar copy for each member.</div>
              )}
            </div>
          )}

          {/* Submit Application Button & Declaration */}
          {family?.status === 'DRAFT' && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              
              <div style={{ maxWidth: 600, margin: '0 auto 1.5rem auto', textAlign: 'left', background: '#f8fafc', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    style={{ width: '1.2rem', height: '1.2rem', marginTop: '0.2rem', accentColor: 'var(--green-600)' }}
                    checked={declarationAccepted}
                    onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-700)', lineHeight: '1.4' }}>
                    <strong>Self-Declaration:</strong> I hereby declare that all the information furnished by me is true and correct to the best of my knowledge and belief. I understand that in the event of any information being found false or incorrect, my application is liable to be rejected and I may be subject to legal action under relevant laws of the Government of India.
                  </span>
                </label>
              </div>

              <div style={{
                opacity: canSubmit ? 1 : 0.5,
                filter: canSubmit ? 'none' : 'blur(1px)',
                transition: 'all 0.3s ease'
              }}>
                <button className="btn btn-primary" style={{ maxWidth: 420 }}
                  disabled={!canSubmit}
                  onClick={handleSubmitApplication}>
                  🚀 Submit Application for Verification
                </button>
              </div>
              {!allVerified && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>
                  ⚠️ All members must have their Aadhaar verified before submission.
                </p>
              )}
              {!mandatoryDocsComplete && allVerified && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>
                  ⚠️ Please upload all mandatory documents (Aadhaar copy for each member).
                </p>
              )}
              {allVerified && mandatoryDocsComplete && !declarationAccepted && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>
                  ⚠️ Please accept the self-declaration above to submit your application.
                </p>
              )}
              <p style={{ color: '#a8a29e', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Once submitted, your application will be reviewed by a Verification Officer.
              </p>
            </div>
          )}

          </>
          )}

          {/* Eligible Schemes Section (Only for ACTIVE families) */}
          {family?.status === 'ACTIVE' && activeTab === 'schemes' && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3>🎁 Eligible Welfare Schemes</h3>
                <span className="status-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>{eligibleSchemes.length} Schemes Available</span>
              </div>
              <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
                Based on your family's verified income and details, you are eligible for the following government schemes:
              </p>
              
              {eligibleSchemes.length === 0 ? (
                <div className="alert alert-info">No schemes currently match your family's criteria.</div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {eligibleSchemes.map(scheme => (
                    <div key={scheme.scheme_id} style={{ padding: '1.5rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', background: '#fafaf9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ color: '#ea580c', marginBottom: '0.5rem', fontSize: '1.1rem' }}>{scheme.scheme_name}</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--gray-700)', marginBottom: '0.5rem' }}>{scheme.description || 'No description available.'}</p>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                          <span><strong>Department:</strong> {scheme.department || 'General'}</span>
                          <span><strong>Scope:</strong> {scheme.evaluation_scope}</span>
                          <span><strong>Income Limit:</strong> {scheme.income_threshold ? `₹${parseFloat(scheme.income_threshold).toLocaleString('en-IN')}` : 'None'}</span>
                        </div>
                      </div>
                      <div>
                        {scheme.redirect_link ? (
                          <a href={scheme.redirect_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                            Apply Now ↗
                          </a>
                        ) : (
                          <button className="btn btn-secondary" disabled>Link Unavailable</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Removed duplicate alerts */}

          {/* Government Footer */}
          <div className="gov-footer">
            <div className="footer-flag">
              <div className="india-flag" style={{ width: 20, height: 14 }}>
                <div className="saffron-band" />
                <div className="white-band" />
                <div className="green-band" />
              </div>
              <span>Made in India 🇮🇳 | Parivar Pehchaan Patra — Digital India Initiative</span>
            </div>
          </div>
        </main>
      </div>

      {/* Add / Edit Member Modal */}
      {(showAddMember || showEditMember) && (
        <div className="modal-overlay" onClick={() => { setShowAddMember(false); setShowEditMember(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{showEditMember ? '✏️ Edit Family Member' : '➕ Add Family Member'}</h3>
            <form onSubmit={handleSaveMember}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" type="text" required
                  value={memberForm.full_name}
                  onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Aadhaar Number *</label>
                <input className="form-input" type="text" maxLength={12} required
                  disabled={showEditMember && memberForm.relationship === 'head'} // Head cannot edit Aadhaar
                  value={memberForm.aadhaar_id}
                  onChange={(e) => setMemberForm({ ...memberForm, aadhaar_id: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth *</label>
                <input className="form-input" type="date" required
                  value={memberForm.date_of_birth}
                  onChange={(e) => setMemberForm({ ...memberForm, date_of_birth: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender *</label>
                <select className="form-select" required
                  value={memberForm.gender}
                  onChange={(e) => setMemberForm({ ...memberForm, gender: e.target.value })}>
                  <option value="">-- Select Gender --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {!memberForm.relationship.includes('head') && (
                <div className="form-group">
                  <label className="form-label">Relationship to Head *</label>
                  <select className="form-select" required
                    value={memberForm.relationship}
                    onChange={(e) => setMemberForm({ ...memberForm, relationship: e.target.value, relationship_custom: '' })}>
                    <option value="">-- Select Relationship --</option>
                    <option value="spouse">Spouse</option>
                    <option value="son">Son</option>
                    <option value="daughter">Daughter</option>
                    <option value="adopted_child">Adopted Child</option>
                    <option value="parent">Parent</option>
                    <option value="sibling">Sibling</option>
                    <option value="grandparent">Grandparent</option>
                    <option value="grandchild">Grandchild</option>
                    <option value="other">Other (Specify Below)</option>
                  </select>
                </div>
              )}
              {memberForm.relationship === 'other' && (
                <div className="form-group">
                  <label className="form-label">Please specify relationship *</label>
                  <input className="form-input" type="text" required
                    placeholder="e.g. Uncle, Aunt, Nephew, Cousin, etc."
                    value={memberForm.relationship_custom}
                    onChange={(e) => setMemberForm({ ...memberForm, relationship_custom: e.target.value })} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Occupation</label>
                <input className="form-input" type="text"
                  value={memberForm.occupation}
                  onChange={(e) => setMemberForm({ ...memberForm, occupation: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Annual Income (₹) *</label>
                <input className="form-input" type="number" required min="0"
                  value={memberForm.annual_income}
                  onChange={(e) => setMemberForm({ ...memberForm, annual_income: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Caste *</label>
                <select className="form-select" required
                  value={memberForm.caste}
                  onChange={(e) => setMemberForm({ ...memberForm, caste: e.target.value })}>
                  <option value="">-- Select Caste Category --</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC (Other Backward Class)</option>
                  <option value="SC">SC (Scheduled Caste)</option>
                  <option value="ST">ST (Scheduled Tribe)</option>
                  <option value="EWS">EWS (Economically Weaker Section)</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddMember(false); setShowEditMember(false); }}>Cancel</button>
                <button type="submit" className="btn btn-success">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Member Aadhaar Modal */}
      {showVerifyMember && (
        <div className="modal-overlay" onClick={() => setShowVerifyMember(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
            <h3>Verify Aadhaar</h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              An OTP has been sent to the mobile number linked with <strong>{verifyForm.name}'s</strong> Aadhaar.
            </p>
            {error && <div className="alert alert-error">{error}</div>}
            
            <form onSubmit={handleVerifyMember}>
              <div className="form-group">
                <input className="form-input" type="text" placeholder="Enter 6-digit OTP" maxLength={6} required
                  style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: '1.2rem', fontWeight: '700' }}
                  value={verifyForm.otp}
                  onChange={(e) => setVerifyForm({ ...verifyForm, otp: e.target.value })} />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: '1.5rem' }}>
                Hint for prototype: Use <strong>123456</strong>
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowVerifyMember(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Verify OTP</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Family Modal */}
      {showEditFamily && (
        <div className="modal-overlay" onClick={() => setShowEditFamily(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>✏️ Edit Family Details</h3>
            <form onSubmit={handleUpdateFamily}>
              <div className="form-group">
                <label className="form-label">Current Address *</label>
                <input className="form-input" type="text" required
                  value={familyForm.current_address}
                  onChange={(e) => setFamilyForm({ ...familyForm, current_address: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">District *</label>
                <input className="form-input" type="text" required
                  value={familyForm.district}
                  onChange={(e) => setFamilyForm({ ...familyForm, district: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">State *</label>
                <input className="form-input" type="text" required
                  value={familyForm.state}
                  onChange={(e) => setFamilyForm({ ...familyForm, state: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Ration Card Number (optional)</label>
                <input className="form-input" type="text"
                  value={familyForm.ration_card_no}
                  onChange={(e) => setFamilyForm({ ...familyForm, ration_card_no: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditFamily(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Per-Member Document Upload Popup */}
      {docMember && (
        <MemberDocUpload
          member={docMember}
          onClose={() => setDocMember(null)}
          onDocumentsChanged={fetchDocuments}
        />
      )}

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmDialog({ isOpen: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#991b1b' }}>⚠️ {confirmDialog.title}</h3>
            <p style={{ color: 'var(--gray-700)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {confirmDialog.message}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmDialog({ isOpen: false })}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirmDialog.onConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
