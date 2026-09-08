import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import {
  Wallet,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ExternalLink,
  RefreshCw,
  Zap,
} from 'lucide-react';

const Dashboard = () => {
  const { user, wallet, refreshWallet } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [payRes] = await Promise.all([
        api.get('/payments?limit=5'),
        refreshWallet(),
      ]);
      setPayments(payRes.data.payments || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  const sentTotal = payments
    .filter((p) => p.senderId?._id === user?.id && p.status === 'SUCCESS')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const receivedTotal = payments
    .filter((p) => p.recipientId?._id === user?.id && p.status === 'SUCCESS')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
              Distributed Payment Queue
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Payments submitted are accepted with HTTP 202 and processed asynchronously by the MongoDB queue worker.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link
            to="/send"
            className="flex-1 md:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Send className="w-4 h-4" />
            Send Money
          </Link>
          <button
            onClick={fetchDashboardData}
            title="Refresh Data"
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet Balance Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between text-slate-400 mb-3 text-xs font-mono font-semibold uppercase tracking-wider">
            <span>Available Balance</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-mono font-bold text-emerald-400 tracking-tight">
            ${(wallet?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
            <span>Currency: <strong>{wallet?.currency || 'USD'}</strong></span>
            <Link to="/wallet" className="text-blue-400 hover:underline flex items-center gap-1 font-semibold">
              View History <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Total Sent */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3 text-xs font-mono font-semibold uppercase tracking-wider">
            <span>Total Sent (Recent)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-mono font-bold text-rose-400 tracking-tight">
            ${sentTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-4 text-xs text-slate-400 border-t border-slate-800/80 pt-3 flex items-center gap-1.5 font-mono">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Processed asynchronously</span>
          </div>
        </div>

        {/* Total Received */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3 text-xs font-mono font-semibold uppercase tracking-wider">
            <span>Total Received (Recent)</span>
            <ArrowDownLeft className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-mono font-bold text-blue-400 tracking-tight">
            ${receivedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-4 text-xs text-slate-400 border-t border-slate-800/80 pt-3 flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Atomic MongoDB transactions</span>
          </div>
        </div>
      </div>

      {/* Recent Payments Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Payment Queue Activity</h2>
            <p className="text-xs text-slate-400">Live payment jobs processed by MongoDB queue worker</p>
          </div>
          <Link
            to="/payments"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            All Payments <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            Loading live payment jobs...
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-slate-800/60">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="text-slate-300 text-sm font-semibold">No payment transactions yet</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Click "Send Money" to enqueue a payment and observe worker execution.
            </p>
            <Link
              to="/send"
              className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors"
            >
              Send Payment Now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono font-semibold">
                  <th className="pb-3 px-3">Payment ID</th>
                  <th className="pb-3 px-3">Sender</th>
                  <th className="pb-3 px-3">Recipient</th>
                  <th className="pb-3 px-3">Amount</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {payments.map((p) => {
                  const isSender = p.senderId?._id === user?.id;
                  return (
                    <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-3 text-slate-300 font-semibold">
                        {p._id.substring(0, 8)}...
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        {p.senderId?.name} {isSender && '(You)'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-300">
                        {p.recipientId?.name} {!isSender && '(You)'}
                      </td>
                      <td className={`py-3.5 px-3 font-bold ${isSender ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isSender ? '-' : '+'}${p.amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3.5 px-3">
                        <Link
                          to={`/payments/${p._id}/trace`}
                          className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-[11px] font-semibold flex items-center gap-1 w-max"
                        >
                          PayFlow Trace
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
