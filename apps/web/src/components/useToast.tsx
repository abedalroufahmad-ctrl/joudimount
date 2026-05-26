import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ToastNotification from './ToastNotification';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const handleCloseToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const toastPortal = document.getElementById("toast-portal");

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastPortal && createPortal(
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 1050,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: '0.5rem'
        }}>
          {toasts.map((toast) => (
            <ToastNotification
              key={toast.id}
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={handleCloseToast}
            />
          ))}
        </div>,
        toastPortal
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};