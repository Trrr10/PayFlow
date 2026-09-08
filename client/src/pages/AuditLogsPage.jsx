import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FileText, RefreshCw, Filter, Shield } from 'lucide-react';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/audit-logs?action=${actionFilter}&limit=100`);
      setLogs(res.data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter]);

  const actions = [
    '',
    'USER_REGISTERED',
    'USER_LOGIN',
    'WALLET_CREATED',
    'PAYMENT_CREATED',
    'PAYMENT_QUEUED',
    'PAYMENT_PROCESSING',
    'PAYMENT_RETRY',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'WALLET_ADJUSTED',
    'WORKER_FAILURE',
    'WORKER_RECOVERY',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">System Audit Log Trail</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Immutable system audit logs for all security, payment queue, and worker events
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Log Feed
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 overflow-x-auto font-mono text-xs">
        <Filter className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-slate-400 shrink-0 font-semibold">Filter Action:</span>
        {actions.map((act) => (
          <button
            key={act}
            onClick={() => setActionFilter(act)}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
              actionFilter === act
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {act || 'ALL ACTIONS'}
          </button>
        ))}
      </div>

      {/* Log Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            Loading system audit log stream...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            No audit logs found matching filter.
          </div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            {logs.map((log) => {
              const isFailure = log.action.includes('FAILURE') || log.action.includes('FAILED');
              const isSuccess = log.action.includes('SUCCESS') || log.action.includes('REGISTERED');
              return (
                <div
                  key={log._id}
                  className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded font-bold text-[11px] border ${
                          isFailure
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : isSuccess
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-slate-400">Actor: <strong className="text-slate-200">{log.actorId?.email || log.actorRole}</strong></span>
                      <span className="text-slate-500">Entity: {log.entityType} ({log.entityId})</span>
                    </div>
                    <span className="text-slate-500 text-[11px]">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>

                  <pre className="p-2.5 bg-slate-900 rounded-lg text-slate-300 text-[11px] overflow-x-auto border border-slate-800">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
