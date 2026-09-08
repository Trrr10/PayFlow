import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import {
  ArrowLeft,
  GitCommit,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
} from 'lucide-react';

const PaymentDetailsPage = () => {
  const { paymentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/payments/${paymentId}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(fetchDetails, 2000);
    return () => clearInterval(interval);
  }, [paymentId]);

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-500 font-mono text-xs">
        Loading payment details...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <div className="text-rose-400 font-semibold text-sm">{error || 'Payment not found'}</div>
        <Link to="/payments" className="inline-block text-xs text-blue-400 hover:underline">
          Back to Payments
        </Link>
      </div>
    );
  }

  const { payment, job, transactions } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/payments"
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </Link>

        <Link
          to={`/payments/${paymentId}/trace`}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <GitCommit className="w-4 h-4 text-cyan-300" />
          Open PayFlow Trace
        </Link>
      </div>

      {/* Main Status Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="text-xs font-mono text-slate-400 mb-1">Payment ID</div>
            <div className="text-lg font-mono font-bold text-white tracking-tight">{payment._id}</div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={payment.status} className="text-sm px-3 py-1.5" />
            <button
              onClick={fetchDetails}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500 mb-1">Amount</div>
            <div className="text-xl font-bold text-white">${payment.amount.toFixed(2)} {payment.currency}</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500 mb-1">Idempotency Key</div>
            <div className="text-cyan-300 font-semibold truncate" title={payment.idempotencyKey}>
              {payment.idempotencyKey}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500 mb-1">Worker Attempts</div>
            <div className="text-amber-400 font-bold">{payment.attempts} / {job?.maxAttempts || 3}</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500 mb-1">Locked Worker ID</div>
            <div className="text-purple-300 font-semibold truncate">
              {job?.lockedBy || 'None (Completed/Released)'}
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono pt-2">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">Sender Account</span>
            <div className="text-slate-200 font-bold">{payment.senderId?.name}</div>
            <div className="text-slate-400">{payment.senderId?.email}</div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px]">Recipient Account</span>
            <div className="text-slate-200 font-bold">{payment.recipientId?.name}</div>
            <div className="text-slate-400">{payment.recipientId?.email}</div>
          </div>
        </div>

        {/* Ledger Transactions */}
        <div className="border-t border-slate-800 pt-6">
          <h3 className="text-sm font-bold text-white mb-3">Committed Ledger Transactions</h3>
          {transactions.length === 0 ? (
            <div className="p-4 bg-slate-950 rounded-xl text-slate-500 font-mono text-xs text-center">
              No ledger transactions committed yet (Job pending in queue).
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {transactions.map((t) => (
                <div key={t._id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className={`px-2 py-0.5 rounded font-bold mr-2 ${t.type === 'DEBIT' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {t.type}
                    </span>
                    <span className="text-slate-300">{t.reference}</span>
                  </div>
                  <div className="text-white font-bold">${t.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsPage;
