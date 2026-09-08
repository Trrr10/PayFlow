import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  ShieldAlert,
  Users,
  Activity,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Sliders,
  DollarSign,
  Clock,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [queueHealth, setQueueHealth] = useState(null);
  const [workersInfo, setWorkersInfo] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Demo Config State
  const [demoDelayMs, setDemoDelayMs] = useState(5000);
  const [simulateOneFailure, setSimulateOneFailure] = useState(false);
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState('');

  // Wallet adjustment state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('100');
  const [adjustReason, setAdjustReason] = useState('Admin demo funding');
  const [adjusting, setAdjusting] = useState(false);
  const [adjustMsg, setAdjustMsg] = useState('');

  const fetchAdminData = async () => {
    try {
      const [statsRes, healthRes, workersRes, configRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/queue-health'),
        api.get('/admin/workers'),
        api.get('/admin/config'),
        api.get('/admin/users'),
      ]);

      setStats(statsRes.data);
      setQueueHealth(healthRes.data);
      setWorkersInfo(workersRes.data);
      setUsers(usersRes.data);
      setDemoDelayMs(configRes.data.demoDelayMs ?? 5000);
      setSimulateOneFailure(configRes.data.simulateOneFailure ?? false);

      if (usersRes.data.length > 0 && !selectedUserId) {
        setSelectedUserId(usersRes.data[0].id);
      }
    } catch (err) {
      console.error('Error loading admin telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateConfig = async (newDelayMs, newSimulateFailure) => {
    setUpdatingConfig(true);
    setConfigMsg('');
    try {
      const res = await api.post('/admin/config', {
        demoDelayMs: newDelayMs !== undefined ? newDelayMs : demoDelayMs,
        simulateOneFailure: newSimulateFailure !== undefined ? newSimulateFailure : simulateOneFailure,
      });

      setDemoDelayMs(res.data.config.demoDelayMs);
      setSimulateOneFailure(res.data.config.simulateOneFailure);
      setConfigMsg('✅ System configuration saved to MongoDB');
      setTimeout(() => setConfigMsg(''), 3000);
      fetchAdminData();
    } catch (err) {
      setConfigMsg('❌ Failed to update configuration');
    } finally {
      setUpdatingConfig(false);
    }
  };

  const handleAdjustWallet = async (e) => {
    e.preventDefault();
    setAdjusting(true);
    setAdjustMsg('');
    try {
      const res = await api.post('/admin/wallet-adjustment', {
        userId: selectedUserId,
        amount: Number(adjustAmount),
        reason: adjustReason,
      });
      setAdjustMsg(`✅ Wallet updated! New balance: $${res.data.newBalance.toFixed(2)}`);
      fetchAdminData();
    } catch (err) {
      setAdjustMsg(`❌ Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-500 font-mono text-xs">
        Loading Admin Telemetry & Real Worker Monitoring...
      </div>
    );
  }

  const registeredCount = workersInfo?.registeredWorkerCount ?? 0;
  const onlineCount = workersInfo?.onlineWorkerCount ?? 0;
  const staleCount = workersInfo?.staleWorkerCount ?? 0;
  const activeWorkerList = workersInfo?.workers || [];
  const primaryWorker = activeWorkerList[0] || null;
  const workerMessage = workersInfo?.message || 'No worker registered';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/20 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
              System Admin Control Center
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-purple-400" />
            Admin Observability Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-1 font-mono">
            Real worker process heartbeats, persistent queue statistics, and demo delay controls.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors self-start md:self-auto font-mono"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Metrics
        </button>
      </div>

      {/* Demo Mode Control Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Demo Mode Control Panel</h2>
              <p className="text-xs text-slate-400">Configure worker processing delay and single-attempt fault simulation</p>
            </div>
          </div>
          {configMsg && (
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              {configMsg}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          {/* Delay Control */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>1. Worker Processing Delay</span>
            </div>
            <p className="text-slate-400 text-[11px] font-sans">
              Adds a delay inside the standalone worker after claiming the job so queue transitions are visible.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[0, 3000, 5000, 10000].map((ms) => (
                <button
                  key={ms}
                  type="button"
                  onClick={() => handleUpdateConfig(ms, simulateOneFailure)}
                  disabled={updatingConfig}
                  className={`py-2 px-3 rounded-lg border font-bold text-xs transition-colors ${
                    demoDelayMs === ms
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {ms === 0 ? '0 ms (Fast)' : `${ms / 1000}s Delay`}
                </button>
              ))}
            </div>
          </div>

          {/* Simulate One Worker Failure Control */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>2. Simulate One Worker Failure</span>
            </div>
            <p className="text-slate-400 text-[11px] font-sans">
              Forces worker to throw an exception on Attempt #1 before transaction commit. Retries on Attempt #2.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleUpdateConfig(demoDelayMs, !simulateOneFailure)}
                disabled={updatingConfig}
                className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                  simulateOneFailure
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 hover:bg-rose-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Zap className={`w-4 h-4 ${simulateOneFailure ? 'text-rose-400 animate-pulse' : ''}`} />
                {simulateOneFailure ? 'Fault Simulation ENABLED' : 'Enable Fault Simulation'}
              </button>
            </div>
          </div>

          {/* Real Worker Heartbeat Status Widget */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>3. Worker Telemetry</span>
              </div>
              {registeredCount === 0 ? (
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-bold">
                  No worker registered
                </span>
              ) : onlineCount > 0 ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                  ONLINE ({onlineCount})
                </span>
              ) : (
                <span className="text-[10px] text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded font-bold">
                  OFFLINE
                </span>
              )}
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Primary Worker ID:</span>
                <strong className="text-purple-300 truncate max-w-[130px]" title={primaryWorker?.workerId}>
                  {primaryWorker?.workerId || 'Unavailable'}
                </strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Process ID (PID):</span>
                <strong className="text-slate-200">
                  {primaryWorker?.processId ? primaryWorker.processId : 'Unavailable'}
                </strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Last Heartbeat:</span>
                <strong className="text-slate-200">
                  {primaryWorker?.lastHeartbeat
                    ? new Date(primaryWorker.lastHeartbeat).toLocaleTimeString()
                    : 'Unavailable'}
                </strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Worker Uptime:</span>
                <strong className="text-emerald-400">
                  {primaryWorker?.uptimeMs
                    ? `${Math.floor(primaryWorker.uptimeMs / 1000)}s`
                    : 'Unavailable'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Queue Health & Worker Telemetry Metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            MongoDB Persistent Queue Statistics
          </h3>
          <span className="text-emerald-400 text-[11px] font-bold">REAL BACKEND DATA</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500">Queued Jobs</div>
            <div className="text-2xl font-bold text-amber-400">
              {queueHealth?.queuedCount ?? 'Unavailable'}
            </div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500">Processing Jobs</div>
            <div className="text-2xl font-bold text-cyan-400">
              {queueHealth?.processingCount ?? 'Unavailable'}
            </div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500">Retrying Jobs</div>
            <div className="text-2xl font-bold text-purple-400">
              {queueHealth?.retryingCount ?? 'Unavailable'}
            </div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500">Completed Jobs</div>
            <div className="text-2xl font-bold text-emerald-400">
              {queueHealth?.successCount ?? 'Unavailable'}
            </div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500">Failed Jobs</div>
            <div className="text-2xl font-bold text-rose-400">
              {queueHealth?.failedCount ?? 'Unavailable'}
            </div>
          </div>
        </div>

        {/* Worker Telemetry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500">Registered Workers</div>
            <div className="text-xl font-bold text-white mt-1">{registeredCount}</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500">Online Workers</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{onlineCount}</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-500">Stale/Offline Workers</div>
            <div className="text-xl font-bold text-slate-400 mt-1">{staleCount}</div>
          </div>
        </div>
      </div>

      {/* Registered Worker Instances List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4">Registered Worker Processes (MongoDB Records)</h3>
        {activeWorkerList.length === 0 ? (
          <div className="text-slate-500 text-xs font-mono py-4 text-center">
            No worker registered in MongoDB yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase">
                  <th className="pb-3 px-3">Worker ID</th>
                  <th className="pb-3 px-3">Process ID</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Current Job</th>
                  <th className="pb-3 px-3">Last Heartbeat</th>
                  <th className="pb-3 px-3">Uptime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeWorkerList.map((w) => (
                  <tr key={w.workerId} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 text-purple-300 font-bold">{w.workerId}</td>
                    <td className="py-3 px-3 text-slate-300">{w.processId}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded font-bold ${w.isStale || w.status === 'OFFLINE' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{w.currentJobId || 'None'}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {w.lastHeartbeat ? new Date(w.lastHeartbeat).toLocaleTimeString() : 'Unavailable'}
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">
                      {w.uptimeMs ? `${Math.floor(w.uptimeMs / 1000)}s` : 'Unavailable'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Controlled Wallet Balance Adjustment Tool */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Admin Wallet Balance Adjustment Tool
          </h3>
          <p className="text-xs text-slate-400">
            Inject or adjust funds into user wallets for demo purposes. Every adjustment is logged to the Audit Trail.
          </p>
        </div>

        {adjustMsg && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-200">
            {adjustMsg}
          </div>
        )}

        <form onSubmit={handleAdjustWallet} className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Target User</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) - Current: ${u.wallet?.balance || 0}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Adjustment Amount ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Reason Note</label>
            <input
              type="text"
              required
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={adjusting}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors text-xs uppercase"
            >
              {adjusting ? 'Updating...' : 'Adjust Wallet Balance'}
            </button>
          </div>
        </form>
      </div>

      {/* All Users List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4">All Registered Users & Wallets</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase">
                <th className="pb-3 px-3">User ID</th>
                <th className="pb-3 px-3">Name</th>
                <th className="pb-3 px-3">Email</th>
                <th className="pb-3 px-3">Role</th>
                <th className="pb-3 px-3">Wallet Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 text-slate-400">{u.id}</td>
                  <td className="py-3 px-3 text-white font-bold">{u.name}</td>
                  <td className="py-3 px-3 text-slate-300">{u.email}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-300'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">${(u.wallet?.balance || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
