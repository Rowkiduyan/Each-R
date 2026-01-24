import React, { useEffect } from 'react';

export default function Toast({ message, visible, onClose, type = 'error' }) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => onClose && onClose(), 2000);
    return () => clearTimeout(t);
  }, [visible, onClose]);

  if (!visible) return null;
  const color = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-gray-800';
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white ${color}`}
         role="alert"
         aria-live="assertive">
      {message}
    </div>
  );
}
