import React, { useState, useMemo } from 'react';
import '../styles/PaymentGateway.css';
import api from '../services/api';
import { useTheme } from '../ThemeContext';

/**
 * PaymentGateway modal
 *
 * Props:
 *  tutor         — tutor match item  { tutor: { _id, hourlyRate, isFree, firstName, lastName, user } }
 *  bookingData   — { studentProfileId, subject, learningStyle, language, availability, matchScore, reasons }
 *  onSuccess     — callback(bookingResult) when payment + booking completed
 *  onClose       — callback to dismiss the modal
 */
export default function PaymentGateway({ tutor, bookingData, onSuccess, onClose }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const tutorProfile = tutor?.tutor || {};
  const hourlyRate   = Number(tutorProfile.hourlyRate || 0);
  const tutorName    = tutorProfile.user?.name
    || `${tutorProfile.firstName || ''} ${tutorProfile.lastName || ''}`.trim()
    || 'Tutor';

  const HOUR_OPTIONS = [0.5, 1, 1.5, 2, 3, 4, 5];
  const [hours, setHours]               = useState(1);
  const [cardHolder, setCardHolder]     = useState('');
  const [cardNumber, setCardNumber]     = useState('');
  const [expiry, setExpiry]             = useState('');
  const [cvv, setCvv]                   = useState('');
  const [errors, setErrors]             = useState({});
  const [apiError, setApiError]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [successData, setSuccessData]   = useState(null); // { transactionRef, totalAmount }

  const total = useMemo(() => Math.round(hourlyRate * hours * 100) / 100, [hourlyRate, hours]);

  /* ── Formatting helpers ── */
  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!cardHolder.trim()) e.cardHolder = 'Card holder name is required';
    const rawCard = cardNumber.replace(/\s/g, '');
    if (!/^\d{16}$/.test(rawCard))  e.cardNumber = 'Enter a valid 16-digit card number';
    if (!/^\d{2}\/\d{2}$/.test(expiry)) e.expiry = 'Enter expiry as MM/YY';
    else {
      const [mm, yy] = expiry.split('/').map(Number);
      const now = new Date();
      const cardYear  = 2000 + yy;
      const cardMonth = mm;
      if (mm < 1 || mm > 12) e.expiry = 'Invalid month';
      else if (cardYear < now.getFullYear() || (cardYear === now.getFullYear() && cardMonth < now.getMonth() + 1)) {
        e.expiry = 'Card has expired';
      }
    }
    if (!/^\d{3,4}$/.test(cvv)) e.cvv = 'Enter a valid CVV';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Pay ── */
  const handlePay = async () => {
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const rawCard    = cardNumber.replace(/\s/g, '');
      const lastFour   = rawCard.slice(-4);

      // Step 1: Initiate payment
      const initRes = await api.post('/payments/initiate', {
        tutorProfileId: tutorProfile._id,
        hours,
        cardHolderName: cardHolder.trim(),
        cardLastFour: lastFour,
      });

      const paymentId = initRes.data.payment._id;

      // Step 2: Confirm payment + create booking
      const confirmRes = await api.post(`/payments/${paymentId}/confirm`, {
        studentProfileId: bookingData.studentProfileId,
        tutorProfileId:   tutorProfile._id,
        subject:          bookingData.subject,
        learningStyle:    bookingData.learningStyle,
        language:         bookingData.language,
        requestedAvailability: bookingData.availability || {},
        matchScore:       bookingData.matchScore || 0,
        reasons:          bookingData.reasons || [],
      });

      setSuccessData({
        transactionRef: confirmRes.data.payment.transactionRef,
        totalAmount:    confirmRes.data.payment.totalAmount,
        booking:        confirmRes.data.booking,
      });

      if (onSuccess) onSuccess(confirmRes.data);
    } catch (err) {
      setApiError(err.response?.data?.message || err.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="pg-overlay" onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}>
      <div className={`pg-modal${isLight ? ' light' : ''}`}>

        {/* Header */}
        <div className="pg-header">
          <div className="pg-header-left">
            <div className="pg-lock-icon">🔒</div>
            <div>
              <div className="pg-title">Secure Payment</div>
              <div className="pg-subtitle">UniConnect · Encrypted checkout</div>
            </div>
          </div>
          {!loading && (
            <button className="pg-close" onClick={onClose} aria-label="Close">✕</button>
          )}
        </div>

        {successData ? (
          /* ── Success screen ── */
          <div className="pg-success">
            <div className="pg-success-icon">✓</div>
            <div className="pg-success-title">Payment Successful!</div>
            <div className="pg-success-sub">
              Your booking request has been sent to <strong>{tutorName}</strong>.
              You'll be notified once they accept.
            </div>
            <div className="pg-txn-ref">{successData.transactionRef}</div>
            <div style={{ fontSize: '0.85rem', color: isLight ? 'rgba(13,27,62,0.55)' : 'rgba(255,255,255,0.45)', marginTop: '0.3rem' }}>
              Amount paid: <strong style={{ color: '#00E5C3' }}>LKR {Number(successData.totalAmount).toLocaleString()}</strong>
            </div>
            <button className="pg-done-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="pg-body">

              {/* Order summary */}
              <div className="pg-summary">
                <div className="pg-summary-title">Order Summary</div>
                <div className="pg-summary-row">
                  <span>Tutor</span>
                  <span style={{ fontWeight: 600 }}>{tutorName}</span>
                </div>
                <div className="pg-summary-row">
                  <span>Subject</span>
                  <span>{bookingData.subject || '—'}</span>
                </div>
                <div className="pg-summary-row">
                  <span>Hourly Rate</span>
                  <span>LKR {hourlyRate.toLocaleString()}/hr</span>
                </div>
                <div className="pg-summary-row">
                  <span>Session Duration</span>
                  <span>{hours} hour{hours !== 1 ? 's' : ''}</span>
                </div>
                <div className="pg-summary-row pg-summary-total">
                  <span>Total</span>
                  <span className="pg-amount-highlight">LKR {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Hours picker */}
              <div className="pg-hours-wrap">
                <label className="pg-label">Session Duration (hours)</label>
                <div className="pg-hours-grid">
                  {HOUR_OPTIONS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`pg-hour-btn${hours === h ? ' active' : ''}`}
                      onClick={() => setHours(h)}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {apiError && <div className="pg-error">{apiError}</div>}

              {/* Card details */}
              <div className="pg-card-section">
                <div className="pg-card-section-title">
                  <span>💳</span>
                  <span>Card Details</span>
                  <div className="pg-card-brands" style={{ marginLeft: 'auto', marginBottom: 0 }}>
                    <span className="pg-brand-badge">VISA</span>
                    <span className="pg-brand-badge">MC</span>
                    <span className="pg-brand-badge">AMEX</span>
                    <span className="pg-secure-note">🔐 SSL</span>
                  </div>
                </div>

                <div className="pg-field">
                  <label className="pg-label">Card Holder Name</label>
                  <input
                    className={`pg-input${errors.cardHolder ? ' error' : ''}`}
                    placeholder="Name on card"
                    value={cardHolder}
                    onChange={(e) => { setCardHolder(e.target.value); setErrors((p) => ({ ...p, cardHolder: undefined })); }}
                    autoComplete="cc-name"
                  />
                  {errors.cardHolder && <div style={{ fontSize: '0.72rem', color: '#ff7070', marginTop: '0.3rem' }}>{errors.cardHolder}</div>}
                </div>

                <div className="pg-field">
                  <label className="pg-label">Card Number</label>
                  <input
                    className={`pg-input${errors.cardNumber ? ' error' : ''}`}
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => { setCardNumber(formatCardNumber(e.target.value)); setErrors((p) => ({ ...p, cardNumber: undefined })); }}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    maxLength={19}
                  />
                  {errors.cardNumber && <div style={{ fontSize: '0.72rem', color: '#ff7070', marginTop: '0.3rem' }}>{errors.cardNumber}</div>}
                </div>

                <div className="pg-row">
                  <div className="pg-field" style={{ marginBottom: 0 }}>
                    <label className="pg-label">Expiry (MM/YY)</label>
                    <input
                      className={`pg-input${errors.expiry ? ' error' : ''}`}
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => { setExpiry(formatExpiry(e.target.value)); setErrors((p) => ({ ...p, expiry: undefined })); }}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      maxLength={5}
                    />
                    {errors.expiry && <div style={{ fontSize: '0.72rem', color: '#ff7070', marginTop: '0.3rem' }}>{errors.expiry}</div>}
                  </div>
                  <div className="pg-field" style={{ marginBottom: 0 }}>
                    <label className="pg-label">CVV</label>
                    <input
                      className={`pg-input${errors.cvv ? ' error' : ''}`}
                      placeholder="•••"
                      value={cvv}
                      onChange={(e) => { setCvv(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrors((p) => ({ ...p, cvv: undefined })); }}
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      maxLength={4}
                      type="password"
                    />
                    {errors.cvv && <div style={{ fontSize: '0.72rem', color: '#ff7070', marginTop: '0.3rem' }}>{errors.cvv}</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pg-footer">
              <button
                className="pg-pay-btn"
                onClick={handlePay}
                disabled={loading}
              >
                {loading
                  ? <><div className="pg-spinner" /><span>Processing…</span></>
                  : <><span>Pay LKR {total.toLocaleString()}</span><span>→</span></>
                }
              </button>
              {!loading && (
                <button className="pg-cancel-btn" onClick={onClose}>
                  Cancel
                </button>
              )}
              <div style={{ textAlign: 'center', marginTop: '0.9rem', fontSize: '0.7rem', color: isLight ? 'rgba(13,27,62,0.35)' : 'rgba(255,255,255,0.2)' }}>
                🔒 Your payment is protected by 256-bit SSL encryption
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
