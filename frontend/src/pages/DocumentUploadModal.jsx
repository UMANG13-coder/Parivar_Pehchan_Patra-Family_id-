import { useState, useEffect, useRef } from 'react';
import { documentAPI } from '../api';

// Helper: get required docs based on relationship & caste
function getRequiredDocs(member) {
  const docs = [
    { type: 'AADHAAR', label: 'Aadhaar Card Copy', mandatory: true, icon: '🆔' },
  ];

  // Caste certificate is mandatory for all members
  docs.push({ type: 'CASTE_CERTIFICATE', label: 'Caste Certificate', mandatory: true, icon: '📜' });

  // Relationship-based mandatory docs (only for non-head members)
  if (!member.is_head_of_family) {
    const rel = (member.relationship || '').toLowerCase();

    if (rel === 'spouse') {
      docs.push({ type: 'MARRIAGE_CERTIFICATE', label: 'Marriage Certificate', mandatory: true, icon: '💍' });
    }

    if (rel === 'child' || rel === 'son' || rel === 'daughter') {
      docs.push({ type: 'BIRTH_CERTIFICATE', label: 'Birth Certificate', mandatory: true, icon: '👶' });
      docs.push({ type: 'MARKSHEET', label: '10th/12th Marksheet (Parent Proof)', mandatory: false, icon: '📝' });
    }

    if (rel === 'adopted_child') {
      docs.push({ type: 'ADOPTION_DEED', label: 'Adoption Deed', mandatory: true, icon: '📋' });
    }
  }

  // Optional docs
  docs.push({ type: 'PANCARD', label: 'PAN Card', mandatory: false, icon: '💳' });

  // Income proof only if income > 0
  if (member.annual_income && parseFloat(member.annual_income) > 0) {
    docs.push({ type: 'INCOME_PROOF', label: 'Income Proof', mandatory: false, icon: '📊' });
  }

  return docs;
}

export default function MemberDocUpload({ member, onClose, onDocumentsChanged }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);

  // Custom "Other" document
  const [showOtherForm, setShowOtherForm] = useState(false);
  const [otherDocName, setOtherDocName] = useState('');

  const requiredDocs = getRequiredDocs(member);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await documentAPI.getDocuments();
      // Filter to only this member's docs
      const memberDocs = res.data.filter(d => d.citizen_id === member.citizen_id);
      setDocuments(memberDocs);
    } catch {
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  const triggerUpload = (docType, label) => {
    setUploadTarget({ type: docType, label });
    fileInputRef.current.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadTarget) return;

    setError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', uploadTarget.type);
    formData.append('citizen_id', member.citizen_id);
    if (uploadTarget.custom_name) {
      formData.append('custom_name', uploadTarget.custom_name);
    }

    try {
      await documentAPI.uploadDocument(formData);
      setSuccessMsg(`${uploadTarget.label} uploaded!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchDocs();
      onDocumentsChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
      setUploadTarget(null);
      e.target.value = '';
    }
  };

  const handleUploadOther = () => {
    if (!otherDocName.trim()) {
      setError('Please enter a document name.');
      return;
    }
    setUploadTarget({ type: 'OTHER', label: otherDocName, custom_name: otherDocName });
    setShowOtherForm(false);
    setOtherDocName('');
    setTimeout(() => fileInputRef.current.click(), 100);
  };

  const handleDelete = async (mappingId, fileName) => {
    setError('');
    try {
      await documentAPI.deleteDocument(mappingId);
      setSuccessMsg(`${fileName} deleted.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchDocs();
      onDocumentsChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete.');
    }
  };

  const getDocFor = (docType) => documents.find(d => d.document.document_type === docType);
  const otherDocs = documents.filter(d => d.document.document_type === 'OTHER');

  // Calculate completion
  const mandatoryDocs = requiredDocs.filter(d => d.mandatory);
  const mandatoryUploaded = mandatoryDocs.filter(d => getDocFor(d.type)).length;
  const allMandatoryDone = mandatoryUploaded === mandatoryDocs.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>📄</div>
          <h3 style={{ margin: '0.3rem 0' }}>Documents for {member.full_name}</h3>
          {member.is_head_of_family && <span className="head-badge">HEAD OF FAMILY</span>}
          {!member.is_head_of_family && member.relationship && (
            <span style={{
              display: 'inline-block', marginTop: '0.3rem', padding: '0.15rem 0.6rem',
              background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem', fontWeight: 600, color: '#1d4ed8', textTransform: 'capitalize'
            }}>
              Relation: {member.relationship_custom || member.relationship}
            </span>
          )}
          <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', margin: '0.3rem 0 0' }}>
            Mandatory documents marked with <span style={{ color: '#ef4444', fontWeight: 700 }}>*</span>
          </p>
          {/* Progress bar */}
          <div style={{
            marginTop: '0.5rem', background: '#f5f5f4', borderRadius: 'var(--radius-md)',
            height: 6, overflow: 'hidden'
          }}>
            <div style={{
              width: `${mandatoryDocs.length > 0 ? (mandatoryUploaded / mandatoryDocs.length) * 100 : 100}%`,
              height: '100%', background: allMandatoryDone ? '#22c55e' : '#f59e0b',
              transition: 'width 0.3s ease', borderRadius: 'var(--radius-md)'
            }} />
          </div>
          <p style={{ fontSize: '0.72rem', color: allMandatoryDone ? '#166534' : '#b45309', fontWeight: 600, marginTop: '0.2rem' }}>
            {allMandatoryDone ? '✅ All mandatory documents uploaded' : `${mandatoryUploaded}/${mandatoryDocs.length} mandatory documents uploaded`}
          </p>
        </div>

        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFileSelected} />

        {error && <div className="alert alert-error">{error}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}
        {uploading && (
          <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--saffron-600)', fontWeight: 600 }}>
            <span className="spinner" style={{ marginRight: '0.5rem' }} /> Uploading...
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner spinner-dark" style={{ width: 30, height: 30 }} />
          </div>
        ) : (
          <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: '0.3rem' }}>
            {/* Standard document types */}
            {requiredDocs.map((docDef) => {
              const existing = getDocFor(docDef.type);
              return (
                <div key={docDef.type} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 0.8rem', background: existing ? '#f0fdf4' : docDef.mandatory ? '#fef2f2' : '#fafaf9',
                  border: `1px solid ${existing ? '#bbf7d0' : docDef.mandatory ? '#fecaca' : '#e7e5e4'}`,
                  borderRadius: 'var(--radius-md)', marginBottom: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{docDef.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {docDef.label}
                      {docDef.mandatory && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
                    </span>
                  </div>
                  {existing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: '#166534', fontSize: '0.75rem', fontWeight: 600 }}>✅ {existing.document.file_name}</span>
                      <button className="btn btn-danger" style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem' }}
                        onClick={() => handleDelete(existing.mapping_id, existing.document.file_name)}>🗑️</button>
                    </div>
                  ) : (
                    <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => triggerUpload(docDef.type, docDef.label)}>
                      📤 Upload
                    </button>
                  )}
                </div>
              );
            })}

            {/* Other (custom) documents */}
            {otherDocs.map((doc) => (
              <div key={doc.mapping_id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.6rem 0.8rem', background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-md)', marginBottom: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>📎</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {doc.document.file_name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: '#166534', fontSize: '0.75rem', fontWeight: 600 }}>✅</span>
                  <button className="btn btn-danger" style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem' }}
                    onClick={() => handleDelete(doc.mapping_id, doc.document.file_name)}>🗑️</button>
                </div>
              </div>
            ))}

            {/* Add Other Document */}
            {showOtherForm ? (
              <div style={{
                padding: '0.8rem', border: '1px dashed var(--saffron-400)', borderRadius: 'var(--radius-md)',
                marginTop: '0.5rem', background: '#fffbeb'
              }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Document Name</label>
                <input className="form-input" type="text" placeholder="e.g. Driving License, Voter ID, etc."
                  value={otherDocName} onChange={(e) => setOtherDocName(e.target.value)} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', flex: 1 }}
                    onClick={() => { setShowOtherForm(false); setOtherDocName(''); }}>Cancel</button>
                  <button className="btn btn-success" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', flex: 1 }}
                    onClick={handleUploadOther}>📤 Select File</button>
                </div>
              </div>
            ) : (
              <button style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                width: '100%', padding: '0.5rem', marginTop: '0.3rem',
                border: '1px dashed var(--gray-300)', borderRadius: 'var(--radius-md)',
                background: 'transparent', color: 'var(--saffron-600)', fontWeight: 600,
                fontSize: '0.8rem', cursor: 'pointer'
              }} onClick={() => setShowOtherForm(true)}>
                ＋ Add Other Document
              </button>
            )}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1.2rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
