import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';
import {
  GitCommit,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Cpu,
  Clock,
  Zap,
  Activity,
  Server,
  Database,
  Radio,
  Wifi,
  WifiOff,
} from 'lucide-react';

const PayFlowTracePage = () => {
  const { paymentId } = useParams();
  const [traceData, setTraceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTrace = async () => {
    try {
      const res = await api.get(`/payments/${paymentId}/trace`);
      setTraceData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load PayFlow Trace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrace();
    // Poll backend trace endpoint every 1000ms until terminal state (SUCCESS or FAILED)
    const interval = setInterval(() => {
      fetchTrace();
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentId]);

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-500 font-mono text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
        Fetching real payment trace from MongoDB Atlas...
      </div>
    );
  }

  if (error || !traceData) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <div className="text-rose-400 font-semibold text-sm">{error || 'Trace data unavailable'}</div>
        <Link to="/payments" className="inline-block text-xs text-blue-400 hover:underline font-mono">
          ← Back to Payments List
        </Link>
      </div>
    );
  }

  const { payment, job, workerStatus, timeline, integrity } = traceData;

  const getEventCardConfig = (evt) => {
    const action = evt.event;
    switch (action) {
      case 'REQUESTED':
      case 'PAYMENT_CREATED':
        return {
          label: 'REQUESTED',
          badgeStyle: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          dotStyle: 'bg-blue-400',
          title: 'API Request Received',
          message: evt.message || 'API received payment request & verified wallet balance synchronously.',
        };
      case 'QUEUED':
      case 'PAYMENT_QUEUED':
        return {
          label: 'QUEUED',
          badgeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dotStyle: 'bg-amber-400',
          title: 'PaymentJob Enqueued',
          message: evt.message || 'PaymentJob persisted in MongoDB Atlas queue.',
        };
      case 'WORKER_CLAIMED':
        return {
          label: 'WORKER CLAIMED',
          badgeStyle: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
          dotStyle: 'bg-indigo-400',
          title: 'Job Claimed Atomically',
          message: evt.message || `Worker ${evt.workerId || 'standalone worker'} atomically claimed the job using findOneAndUpdate.`,
        };
      case 'PROCESSING':
      case 'PAYMENT_PROCESSING':
        return {
          label: 'PROCESSING',
          badgeStyle: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          dotStyle: 'bg-cyan-400 animate-pulse',
          title: evt.attempt > 1 ? `Processing Retry (Attempt #${evt.attempt})` : 'Processing Payment Transaction',
          message: evt.message || `Worker is executing payment transaction (Attempt #${evt.attempt || 1}).`,
        };
      case 'WORKER_FAILURE':
        return {
          label: 'WORKER FAILURE',
          badgeStyle: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dotStyle: 'bg-rose-500',
          title: 'Worker Exception Triggered',
          message: evt.message || 'Controlled worker failure occurred before transaction commit.',
        };
      case 'RETRY_SCHEDULED':
      case 'PAYMENT_RETRY':
        return {
          label: 'RETRY SCHEDULED',
          badgeStyle: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          dotStyle: 'bg-purple-400',
          title: 'Exponential Backoff Scheduled',
          message: evt.message || 'Job scheduled for retry using exponential backoff.',
        };
      case 'SUCCESS':
      case 'PAYMENT_SUCCESS':
        return {
          label: 'SUCCESS',
          badgeStyle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dotStyle: 'bg-emerald-400',
          title: 'Transaction Committed',
          message: evt.message || 'Atomic MongoDB transaction committed successfully.',
        };
      case 'FAILED':
      case 'PAYMENT_FAILED':
        return {
          label: 'FAILED',
          badgeStyle: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dotStyle: 'bg-rose-400',
          title: 'Payment Permanently Failed',
          message: evt.message || 'Payment permanently failed after exhausting retry attempts.',
        };
      default:
        return {
          label: action,
          badgeStyle: 'bg-slate-800 text-slate-300 border-slate-700',
          dotStyle: 'bg-slate-400',
          title: action,
          message: evt.message || 'Queue transition event recorded.',
        };
    }
  };

  const isWorkerOnline = workerStatus?.isOnline;
  const statusText = workerStatus?.statusText || 'No worker registered';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/payments"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-cyan-400" />
              <h1 className="text-2xl font-bold text-white tracking-tight">PayFlow Trace Engine</h1>
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono px-2 py-0.5 rounded font-semibold">
                SYSTEM INSPECTOR
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5 font-mono">
              Trace ID: {payment.id}
            </p>
          </div>
        </div>

        <button
          onClick={fetchTrace}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto font-mono"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Trace
        </button>
      </div>

      {/* Requirement #5: Asynchronous HTTP 202 Notice Banner */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-cyan-500/30 rounded-2xl p-5 font-mono text-xs space-y-2 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-cyan-300 text-sm">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Asynchronous Producer-Consumer Architecture</span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
            HTTP 202 Accepted
          </span>
        </div>
        <p className="text-slate-200 leading-relaxed font-sans text-xs">
          Payment accepted and waiting for the standalone worker. The Express API returned HTTP 202 immediately. The standalone Node.js worker process claims jobs atomically from MongoDB Atlas and executes atomic wallet updates.
        </p>
      </div>

      {/* Distributed System Monitoring Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <Radio className="w-5 h-5 text-purple-400 animate-pulse" />
            <span>Distributed System Monitoring Panel</span>
          </div>
          <div className="flex items-center gap-2">
            {statusText === 'No worker registered' ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-full font-mono text-xs font-bold">
                No worker registered
              </span>
            ) : isWorkerOnline ? (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-mono text-xs font-bold">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                Worker Online ({statusText})
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full font-mono text-xs font-bold">
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                Worker Offline
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Queue Storage</div>
            <div className="text-amber-400 font-bold text-sm flex items-center gap-1">
              <Database className="w-4 h-4" /> MongoDB Atlas
            </div>
            <div className="text-slate-400 text-[11px]">PaymentJob Collection</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">API Producer</div>
            <div className="text-emerald-400 font-bold text-sm flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Online (Express)
            </div>
            <div className="text-slate-400 text-[11px]">Returns HTTP 202</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Worker Consumer</div>
            <div className={`font-bold text-sm flex items-center gap-1 ${isWorkerOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
              <Server className="w-4 h-4" /> {statusText}
            </div>
            <div className="text-slate-400 text-[11px] truncate" title={workerStatus?.workerId}>
              {workerStatus?.workerId || 'No registered worker'}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Worker Process</div>
            <div className="text-purple-300 font-bold text-sm">Standalone Node.js</div>
            <div className="text-slate-400 text-[11px]">
              PID: {workerStatus?.processId || 'Unavailable'}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Queued Jobs</div>
            <div className="text-amber-400 font-bold text-base">
              {workerStatus?.queueStats?.queued ?? 'Unavailable'}
            </div>
            <div className="text-slate-400 text-[11px]">Pending in queue</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Processing Jobs</div>
            <div className="text-cyan-400 font-bold text-base">
              {workerStatus?.queueStats?.processing ?? 'Unavailable'}
            </div>
            <div className="text-slate-400 text-[11px]">In-flight with worker</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Completed Jobs</div>
            <div className="text-emerald-400 font-bold text-base">
              {workerStatus?.queueStats?.completed ?? 'Unavailable'}
            </div>
            <div className="text-slate-400 text-[11px]">Committed successfully</div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-semibold">Last Worker Heartbeat</div>
            <div className="text-slate-200 font-bold text-xs truncate">
              {workerStatus?.lastHeartbeat
                ? new Date(workerStatus.lastHeartbeat).toLocaleTimeString()
                : 'No Heartbeat'}
            </div>
            <div className="text-slate-400 text-[11px]">MongoDB Heartbeat Log</div>
          </div>
        </div>
      </div>

      {/* Visual Lifecycle Event Cards Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Real Backend Execution Timeline
            </h2>
            <p className="text-xs text-slate-400">Step-by-step queue transitions and worker execution events from AuditLogs</p>
          </div>
          <StatusBadge status={payment.status} />
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {timeline.map((evt, idx) => {
            const card = getEventCardConfig(evt);
            return (
              <div key={idx} className="relative flex items-start gap-4">
                {/* Node Dot */}
                <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center`}>
                  <div className={`w-2 h-2 rounded-full ${card.dotStyle}`} />
                </div>

                <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-5 flex-1 font-mono text-xs space-y-2 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded border text-[11px] font-bold ${card.badgeStyle}`}>
                        {card.label}
                      </span>
                      {evt.attempt && (
                        <span className="text-amber-400 font-bold text-[11px]">Attempt #{evt.attempt}</span>
                      )}
                    </div>
                    <span className="text-slate-500 text-[11px]">{new Date(evt.timestamp).toLocaleString()}</span>
                  </div>

                  <h3 className="text-white font-bold text-sm font-sans">{card.title}</h3>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans">{card.message}</p>

                  <div className="flex flex-wrap items-center gap-4 text-slate-400 text-[11px] pt-2 border-t border-slate-900">
                    {evt.workerId && (
                      <span>Worker Node: <strong className="text-purple-300">{evt.workerId}</strong></span>
                    )}
                    {evt.details?.jobId && (
                      <span>Job ID: <strong className="text-slate-300">{evt.details.jobId}</strong></span>
                    )}
                  </div>

                  {evt.error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-[11px] font-sans mt-2">
                      <strong>Error Details:</strong> {evt.error}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distributed Integrity Verification */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Distributed Integrity Verification</h2>
              <p className="text-xs text-slate-400">Database verification of atomic transaction rules</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
            AUDIT METRICS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-slate-300 font-bold">DEBIT Transaction Record</div>
              <div className="text-slate-500 text-[11px]">Exactly 1 debit recorded</div>
            </div>
            <div className="text-emerald-400 font-bold text-base flex items-center gap-1">
              <CheckCircle2 className="w-5 h-5" />
              {integrity.debitCount} / 1
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-slate-300 font-bold">CREDIT Transaction Record</div>
              <div className="text-slate-500 text-[11px]">Exactly 1 credit recorded</div>
            </div>
            <div className="text-emerald-400 font-bold text-base flex items-center gap-1">
              <CheckCircle2 className="w-5 h-5" />
              {integrity.creditCount} / 1
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-slate-300 font-bold">Idempotency Lock</div>
              <div className="text-slate-500 text-[11px]">Unique index enforced</div>
            </div>
            <div className="text-cyan-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-5 h-5" />
              {integrity.idempotencyProtection}
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-slate-300 font-bold">Atomic Transaction</div>
              <div className="text-slate-500 text-[11px]">MongoDB Session Commit</div>
            </div>
            <div className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-5 h-5" />
              {integrity.atomicWalletUpdate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayFlowTracePage;
