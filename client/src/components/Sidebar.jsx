import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Wallet,
  Send,
  History,
  GitCommit,
  ShieldAlert,
  FileText,
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/wallet', label: 'My Wallet', icon: Wallet },
    { to: '/send', label: 'Send Payment', icon: Send },
    { to: '/payments', label: 'Payment History', icon: History },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Admin Dashboard', icon: ShieldAlert },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-65px)]">
      <div className="space-y-6">
        <div>
          <div className="text-[11px] font-mono font-semibold uppercase text-slate-500 tracking-wider px-3 mb-2">
            User Workspace
          </div>
          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {user?.role === 'ADMIN' && (
          <div>
            <div className="text-[11px] font-mono font-semibold uppercase text-purple-400/80 tracking-wider px-3 mb-2 flex items-center justify-between">
              <span>Admin System</span>
              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/30">
                PRO
              </span>
            </div>
            <nav className="space-y-1">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                        isActive
                          ? 'bg-purple-600/15 text-purple-300 border border-purple-500/20 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs">
        <div className="flex items-center gap-2 font-mono text-slate-300 font-semibold mb-1">
          <GitCommit className="w-4 h-4 text-cyan-400" />
          <span>MongoDB Queue Engine</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Payments enqueued as <code className="text-amber-400">QUEUED</code> & claimed by process worker with atomic transactions.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
