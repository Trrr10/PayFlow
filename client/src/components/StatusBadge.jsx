import React from 'react';
import { Clock, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

const StatusBadge = ({ status, className = '' }) => {
  const normalized = (status || '').toUpperCase();

  switch (normalized) {
    case 'QUEUED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
          <Clock className="w-3.5 h-3.5" />
          QUEUED
        </span>
      );
    case 'PROCESSING':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse ${className}`}>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          PROCESSING
        </span>
      );
    case 'SUCCESS':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          SUCCESS
        </span>
      );
    case 'FAILED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}>
          <AlertCircle className="w-3.5 h-3.5" />
          FAILED
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          {normalized || 'UNKNOWN'}
        </span>
      );
  }
};

export default StatusBadge;
