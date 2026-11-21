import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { SystemNotification } from '../types.ts';

interface NotificationToastProps {
  notifications: SystemNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full no-print">
      {notifications.map((n) => {
        const bg =
          n.type === 'success'
            ? 'bg-emerald-700 border-emerald-600 text-white'
            : n.type === 'error'
            ? 'bg-rose-700 border-rose-600 text-white'
            : n.type === 'warning'
            ? 'bg-amber-600 border-amber-500 text-white'
            : 'bg-slate-800 border-slate-700 text-white';

        const Icon =
          n.type === 'success'
            ? CheckCircle2
            : n.type === 'error'
            ? AlertCircle
            : n.type === 'warning'
            ? AlertTriangle
            : Info;

        return (
          <div
            key={n.id}
            className={`flex items-start justify-between p-3.5 rounded-xl shadow-2xl border ${bg} transition-all duration-300 animate-in fade-in slide-in-from-top-4`}
          >
            <div className="flex items-start gap-2.5">
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">{n.text}</p>
            </div>
            <button
              onClick={() => onDismiss(n.id)}
              className="text-white/80 hover:text-white p-0.5 rounded transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
