import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OtpVerification() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Check if we have pending verification data
    const data = sessionStorage.getItem('pendingVerification');
    if (!data) {
      navigate('/signup');
      return;
    }
    setPendingData(JSON.parse(data));
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timer > 0 && !verified) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setCanResend(true);
    }
  }, [timer, verified]);

  // Auto focus first input
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only keep last digit
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Go back on Backspace if current field is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  const handleResendOtp = () => {
    setTimer(30);
    setCanResend(false);
    setError('');
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError('');

    // Simulate OTP verification (for prototype, accept "123456")
    setTimeout(() => {
      if (otpString === '123456') {
        setVerified(true);
        setLoading(false);

        // Clean up session storage
        sessionStorage.removeItem('pendingVerification');

        // Redirect to login after 2.5 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      } else {
        setError('Invalid OTP. For this prototype, use: 123456');
        setLoading(false);
      }
    }, 1500); // Simulate network delay
  };

  const maskedMobile = pendingData?.mobile_number
    ? `XXXXXX${pendingData.mobile_number.slice(-4)}`
    : 'XXXXXX****';

  if (verified) {
    return (
      <>
        <div className="tricolor-strip" />
        <div className="bg-animated" />
        <div className="auth-container">
          <div className="auth-card" style={{ textAlign: 'center' }}>
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

            {/* Step Indicator — All Completed */}
            <div className="step-indicator">
              <div className="step">
                <div className="step-number completed">✓</div>
              </div>
              <div className="step-line completed" />
              <div className="step">
                <div className="step-number completed">✓</div>
              </div>
              <div className="step-line completed" />
              <div className="step">
                <div className="step-number completed">✓</div>
              </div>
            </div>

            <div className="checkmark-circle">
              <span>✓</span>
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
              Aadhaar Verified Successfully! 🎉
            </h2>
            <p style={{ color: '#78716c', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Your identity has been verified via UIDAI.
            </p>
            <p style={{ color: '#78716c', fontSize: '0.85rem' }}>
              Redirecting to login page...
            </p>

            <div style={{ marginTop: '1.5rem' }}>
              <div className="spinner spinner-dark" style={{ width: 28, height: 28, margin: '0 auto' }} />
            </div>
          </div>
        </div>
      </>
    );
  }

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
              <span className="emblem-text">UIDAI Verification</span>
              <div className="india-flag india-flag-lg">
                <div className="saffron-band" />
                <div className="white-band" />
                <div className="green-band" />
              </div>
            </div>
          </div>

          <div className="auth-logo">
            <div className="auth-logo-icon">🔐</div>
            <h1><span>Aadhaar</span> OTP</h1>
          </div>
          <p className="auth-subtitle">
            Verify your identity to complete registration
          </p>

          {/* Step Indicator */}
          <div className="step-indicator">
            <div className="step">
              <div className="step-number completed">✓</div>
            </div>
            <div className="step-line completed" />
            <div className="step">
              <div className="step-number active">2</div>
            </div>
            <div className="step-line" />
            <div className="step">
              <div className="step-number inactive">✓</div>
            </div>
          </div>

          {/* OTP Info Box */}
          <div className="otp-info">
            📱 OTP sent to <strong>{maskedMobile}</strong> linked to your Aadhaar
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleVerify}>
            {/* OTP Input Boxes */}
            <div className="otp-container" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  className={`otp-input ${digit ? 'filled' : ''}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {/* Timer / Resend */}
            <div className="otp-timer">
              {canResend ? (
                <button type="button" className="otp-resend" onClick={handleResendOtp}>
                  🔄 Resend OTP
                </button>
              ) : (
                <span>
                  Resend OTP in <strong>00:{timer.toString().padStart(2, '0')}</strong>
                </span>
              )}
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading || otp.join('').length !== 6}>
              {loading ? <span className="spinner" /> : '✅ Verify & Complete Registration'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <p style={{ fontSize: '0.8rem', color: '#a8a29e' }}>
              💡 For this prototype, use OTP: <strong style={{ color: '#ea580c', fontFamily: 'monospace' }}>123456</strong>
            </p>
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
            <p style={{ fontSize: '0.65rem', color: '#d6d3d1' }}>Powered by UIDAI — Digital India Initiative</p>
          </div>
        </div>
      </div>
    </>
  );
}
