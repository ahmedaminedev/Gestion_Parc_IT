import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

interface FormAlertProps {
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const FormAlert: React.FC<FormAlertProps> = ({
  type = 'error',
  title,
  message,
  onClose,
  className = '',
}) => {
  if (!message) return null;

  const styles = {
    error: {
      bg: 'bg-red-50/90 border-red-200 text-red-800',
      icon: <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
      closeBtn: 'text-red-400 hover:text-red-700 hover:bg-red-100',
    },
    warning: {
      bg: 'bg-amber-50/90 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
      closeBtn: 'text-amber-400 hover:text-amber-700 hover:bg-amber-100',
    },
    info: {
      bg: 'bg-blue-50/90 border-blue-200 text-blue-900',
      icon: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
      closeBtn: 'text-blue-400 hover:text-blue-700 hover:bg-blue-100',
    },
    success: {
      bg: 'bg-emerald-50/90 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
      closeBtn: 'text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100',
    },
  }[type];

  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs leading-relaxed transition-all shadow-2xs ${styles.bg} ${className}`}
    >
      {styles.icon}
      <div className="flex-1">
        {title && <p className="font-bold text-xs mb-0.5">{title}</p>}
        <p className="font-medium">{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={`p-1 rounded-lg transition-colors cursor-pointer ${styles.closeBtn}`}
          title="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
