import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

// Password criteria checks
const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'One digit (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    aadhaar_id: '',
    mobile_number: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // Live password strength
  const passwordChecks = useMemo(() => {
    return PASSWORD_RULES.map((rule) => ({
      ...rule,
      passed: rule.test(formData.password),
    }));
  }, [formData.password]);

  const passedCount = passwordChecks.filter((c) => c.passed).length;
  const allPassed = passedCount === PASSWORD_RULES.length;

  const strengthLabel = () => {
    if (formData.password.length === 0) return '';
    if (passedCount <= 1) return 'Very Weak';
    if (passedCount <= 2) return 'Weak';
    if (passedCount <= 3) return 'Fair';
    if (passedCount <= 4) return 'Strong';
    return 'Very Strong';
  };

  const strengthColor = () => {
    if (passedCount <= 1) return '#ef4444';
    if (passedCount <= 2) return '#f97316';
    if (passedCount <= 3) return '#eab308';
    if (passedCount <= 4) return '#22c55e';
    return '#138808';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Frontend validations
    if (!/^\d{12}$/.test(formData.aadhaar_id)) {
      setError('Aadhaar number must be exactly 12 digits.');
      setLoading(false);
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.mobile_number)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      setLoading(false);
      return;
    }

    if (!allPassed) {
      setError('Password does not meet the required criteria. Please check the requirements below.');
      setLoading(false);
      setShowPasswordRules(true);
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const { confirm_password, ...submitData } = formData;
      const res = await authAPI.signup(submitData);

      // Store signup data temporarily for OTP verification
      sessionStorage.setItem('pendingVerification', JSON.stringify({
        token: res.data.token,
        user: res.data.user,
        family: res.data.family,
        mobile_number: formData.mobile_number,
      }));

      // Redirect to OTP verification (NOT dashboard)
      navigate('/verify-otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="tricolor-strip" />
      <div className="bg-animated" />
      <div className="auth-container">
        <div className="auth-card">
          {/* Emblem & Flag */}
          <div className="auth-emblem">
            <div className="flag-row">
              <div className="india-flag india-flag-lg">
                <div className="saffron-band" />
                <div className="white-band" />
                <div className="green-band" />
              </div>
              <span className="emblem-text">Government of India</span>
              <div className="india-flag india-flag-lg">
                <div className="saffron-band" />
                <div className="white-band" />
                <div className="green-band" />
              </div>
            </div>
          </div>

          <div className="auth-logo">
            <div className="auth-logo-icon">🏛️</div>
            <h1><span>Parivar</span> Pehchaan</h1>
          </div>
          <p className="auth-subtitle">
            Register as Head of Family to begin your application
          </p>

          {/* Step Indicator */}
          <div className="step-indicator">
            <div className="step">
              <div className="step-number active">1</div>
            </div>
            <div className="step-line" />
            <div className="step">
              <div className="step-number inactive">2</div>
            </div>
            <div className="step-line" />
            <div className="step">
              <div className="step-number inactive">✓</div>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="full_name">👤 Full Name (as per Aadhaar)</label>
              <input
                id="full_name"
                className="form-input"
                type="text"
                name="full_name"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="aadhaar_id">🆔 Aadhaar Number</label>
              <input
                id="aadhaar_id"
                className={`form-input ${formData.aadhaar_id && !/^\d{12}$/.test(formData.aadhaar_id) ? 'error' : ''}`}
                type="text"
                name="aadhaar_id"
                placeholder="Enter 12-digit Aadhaar number"
                value={formData.aadhaar_id}
                onChange={handleChange}
                maxLength={12}
                required
              />
              {formData.aadhaar_id && !/^\d{12}$/.test(formData.aadhaar_id) && (
                <div className="form-error">Aadhaar must be exactly 12 digits</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mobile_number">📱 Mobile Number (linked to Aadhaar)</label>
              <input
                id="mobile_number"
                className={`form-input ${formData.mobile_number && !/^[6-9]\d{9}$/.test(formData.mobile_number) ? 'error' : ''}`}
                type="tel"
                name="mobile_number"
                placeholder="Enter 10-digit mobile number"
                value={formData.mobile_number}
                onChange={handleChange}
                maxLength={10}
                required
              />
              {formData.mobile_number && !/^[6-9]\d{9}$/.test(formData.mobile_number) && (
                <div className="form-error">Must be a valid 10-digit number starting with 6, 7, 8, or 9</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">🔒 Create Password</label>
              <input
                id="password"
                className={`form-input ${formData.password && !allPassed ? 'error' : ''}`}
                type="password"
                name="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setShowPasswordRules(true)}
                required
              />

              {/* Password Strength Bar */}
              {formData.password.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '0.35rem'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: strengthColor() }}>
                      {strengthLabel()}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#a8a29e' }}>{passedCount}/{PASSWORD_RULES.length}</span>
                  </div>
                  <div style={{
                    height: 4, borderRadius: 999, background: '#e7e5e4', overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(passedCount / PASSWORD_RULES.length) * 100}%`,
                      background: strengthColor(),
                      borderRadius: 999,
                      transition: 'all 0.3s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Password Rules Checklist */}
              {showPasswordRules && (
                <div style={{
                  marginTop: '0.6rem',
                  padding: '0.75rem',
                  background: '#fafaf9',
                  border: '1px solid #e7e5e4',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#57534e', marginBottom: '0.4rem' }}>
                    Password Requirements:
                  </p>
                  {passwordChecks.map((rule, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      fontSize: '0.78rem', padding: '0.15rem 0',
                      color: rule.passed ? '#138808' : '#78716c',
                      fontWeight: rule.passed ? 600 : 400,
                    }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: '50%',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', flexShrink: 0,
                        background: rule.passed ? '#f0fdf4' : '#f5f5f4',
                        border: `1.5px solid ${rule.passed ? '#138808' : '#d6d3d1'}`,
                        color: rule.passed ? '#138808' : '#a8a29e',
                      }}>
                        {rule.passed ? '✓' : '·'}
                      </span>
                      {rule.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm_password">🔒 Confirm Password</label>
              <input
                id="confirm_password"
                className={`form-input ${formData.confirm_password && formData.password !== formData.confirm_password ? 'error' : ''}`}
                type="password"
                name="confirm_password"
                placeholder="Re-enter your password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
              />
              {formData.confirm_password && formData.password !== formData.confirm_password && (
                <div className="form-error">Passwords do not match</div>
              )}
              {formData.confirm_password && formData.password === formData.confirm_password && formData.confirm_password.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#138808', marginTop: '0.3rem', fontWeight: 600 }}>
                  ✓ Passwords match
                </div>
              )}
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Proceed to Aadhaar Verification →'}
            </button>
          </form>

          <div className="auth-footer">
            Already registered? <Link to="/login">Sign in</Link>
          </div>

          {/* Government Footer */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e7e5e4' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
              <div className="india-flag" style={{ width: 20, height: 14 }}>
                <div className="saffron-band" />
                <div className="white-band" />
                <div className="green-band" />
              </div>
              <span style={{ fontSize: '0.7rem', color: '#a8a29e', fontWeight: 600 }}>Made in India 🇮🇳</span>
            </div>
            <p style={{ fontSize: '0.65rem', color: '#d6d3d1' }}>Parivar Pehchaan Patra — Digital India Initiative</p>
          </div>
        </div>
      </div>
    </>
  );
}
