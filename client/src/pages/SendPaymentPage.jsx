import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Users,
  Loader2,
} from 'lucide-react';

const SendPaymentPage = () => {
  const { user, wallet, refreshWallet } = useAuth();
  const navigate = useNavigate();

  const [recipients, setRecipients] = useState([]);
  const [recipientId, setRecipientId] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [recipientsError, setRecipientsError] = useState('');

  const [amount, setAmount] = useState('50');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [responseInfo, setResponseInfo] = useState(null);
  const [error, setError] = useState('');

  const currentBalance = wallet?.balance ?? 0;
  const numAmount = Number(amount);

  let amountError = '';
  if (!amount || isNaN(numAmount) || numAmount <= 0) {
    amountError = 'Enter a valid payment amount.';
  } else if (numAmount > currentBalance) {
    amountError = `Insufficient balance. You can send up to $${currentBalance.toFixed(2)}.`;
  }

  const isSubmitDisabled =
    submitting ||
    loadingRecipients ||
    recipients.length === 0 ||
    !recipientId ||
    Boolean(amountError);

  const generateIdempotencyKey = () => {
    const key = `KEY-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    setIdempotencyKey(key);
    return key;
  };

  useEffect(() => {
    generateIdempotencyKey();
    fetchRecipients();
    if (refreshWallet) refreshWallet();
  }, []);

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    setRecipientsError('');
    try {
      // Call authenticated user endpoint (non-admin)
      const res = await api.get('/users/recipients');
      const data = res.data || [];
      setRecipients(data);

      if (data.length > 0) {
        const defaultId = data[0].id || data[0]._id;
        setRecipientId(defaultId);
      }
    } catch (err) {
      console.error('Error fetching recipients:', err);
      setRecipientsError(
        err.response?.data?.error || 'Failed to load eligible recipients. Please verify your connection.'
      );
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResponseInfo(null);

    if (amountError) {
      return;
    }

    if (!recipientId) {
      setError('Please select a valid payment recipient.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post('/payments', {
        recipientId,
        amount: Number(amount),
        idempotencyKey,
      });

      setResponseInfo(res.data);
      if (refreshWallet) refreshWallet();

      // Auto redirect to PayFlow Trace after 1.8 seconds so user can see live processing
      setTimeout(() => {
        navigate(`/payments/${res.data.paymentId}/trace`);
      }, 1800);
    } catch (err) {
      const errMsg =
        err.response?.data?.message === 'Insufficient balance'
          ? `Insufficient balance. Available: $${(err.response?.data?.availableBalance ?? 0).toFixed(2)}`
          : err.response?.data?.error || 'Failed to submit payment request';
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Send Money (Asynchronous Queue)</h1>
        <p className="text-slate-400 text-xs mt-1">
          Payments are validated synchronously by the API and enqueued into MongoDB. A separate worker process processes the atomic transaction.
        </p>
      </div>

      {/* Async Explanation Banner */}
      <div className="bg-blue-950/40 border border-blue-500/20 rounded-2xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 font-mono font-semibold text-blue-300">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>Producer-Consumer Queue Architecture</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          1. Express API receives request, performs input & balance checks synchronously.
          <br />
          2. API creates <code className="text-amber-400 font-bold">QUEUED</code> job & returns <code className="text-emerald-400 font-bold">HTTP 202 Accepted</code> immediately.
          <br />
          3. Standalone Node.js Worker process claims job atomically with <code className="text-cyan-300 font-bold">findOneAndUpdate</code> and executes MongoDB session transaction.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {responseInfo && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-2 font-mono">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>{responseInfo.message}</span>
            </div>
            <div>HTTP Response Status: <strong>202 Accepted</strong></div>
            <div>Payment ID: <strong>{responseInfo.paymentId}</strong></div>
            <div>Status: <span className="text-amber-400 font-bold">{responseInfo.status}</span></div>
            {responseInfo.isDuplicate && (
              <div className="p-2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                🛡️ <strong>Idempotency Match:</strong> Re-submitted identical key. No second payment created.
              </div>
            )}
            <div className="text-slate-400 pt-1">Redirecting to PayFlow Trace...</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                Select Payment Recipient
              </label>
              {loadingRecipients && (
                <span className="text-xs text-blue-400 flex items-center gap-1 font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading recipients...
                </span>
              )}
            </div>

            {loadingRecipients ? (
              <div className="w-full py-3 px-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs font-mono flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                Fetching recipient directory...
              </div>
            ) : recipientsError ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center justify-between">
                <span>{recipientsError}</span>
                <button
                  type="button"
                  onClick={fetchRecipients}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded text-[11px] font-bold"
                >
                  Retry
                </button>
              </div>
            ) : recipients.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
                No other registered users found in the network to receive payments.
              </div>
            ) : (
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                {recipients.map((u) => {
                  const uId = u.id || u._id;
                  return (
                    <option key={uId} value={uId}>
                      {u.name} — {u.email}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Amount */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Payment Amount ($ USD)
              </label>
              <span className="text-xs text-slate-400 font-mono">
                Your Wallet Balance: <strong className="text-emerald-400">${currentBalance.toFixed(2)}</strong>
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3 text-slate-500 font-mono font-bold text-lg">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full pl-9 pr-4 py-3 bg-slate-950 border rounded-xl text-white font-mono font-bold text-lg focus:outline-none transition-colors ${
                  amountError ? 'border-rose-500/60 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
            </div>
            {amountError && (
              <p className="text-xs text-rose-400 mt-1.5 font-medium flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                {amountError}
              </p>
            )}
          </div>

          {/* Idempotency Key Manager */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Idempotency Key (Duplicate Prevention)
              </label>
              <button
                type="button"
                onClick={generateIdempotencyKey}
                className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Generate New Key
              </button>
            </div>
            <input
              type="text"
              required
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Submitting the exact same idempotency key twice guarantees that only ONE payment is executed.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Enqueueing Job...' : 'Submit Payment (HTTP 202)'}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendPaymentPage;
