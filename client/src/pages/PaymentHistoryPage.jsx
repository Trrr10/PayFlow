import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import { Search, RefreshCw, GitCommit } from 'lucide-react';

const PaymentHistoryPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payments?search=${search}&status=${statusFilter}`);
      setPayments(res.data.payments || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payment Job History</h1>
          <p className="text-slate-400 text-xs mt-1">
            View status and execution details of all enqueued payment jobs
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Status
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Payment ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto">
          {['', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st || 'ALL STATUSES'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            Fetching payment job history...
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            No payments found matching filter criteria.
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
                  <th className="pb-3 px-3">Attempts</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">PayFlow Trace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-slate-200">
                      {p._id}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">{p.senderId?.name || p.senderId}</td>
                    <td className="py-3.5 px-3 text-slate-300">{p.recipientId?.name || p.recipientId}</td>
                    <td className="py-3.5 px-3 font-bold text-white">${p.amount.toFixed(2)}</td>
                    <td className="py-3.5 px-3 text-slate-400">{p.attempts || 0}</td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3.5 px-3">
                      <Link
                        to={`/payments/${p._id}/trace`}
                        className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors font-semibold flex items-center gap-1.5 w-max"
                      >
                        <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                        View Trace
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistoryPage;
