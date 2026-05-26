import React from 'react';

interface ToastNotificationProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: (id: string) => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ id, message, type, onClose }) => {
  const bgColor = {
    success: 'bg-success',
    error: 'bg-danger',
    info: 'bg-info',
    warning: 'bg-warning',
  }[type];

  return (
    <div className={`toast show ${bgColor} text-white`} role="alert" aria-live="assertive" aria-atomic="true">
      <div className="d-flex">
        <div className="toast-body">
          {message}
        </div>
        <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close" onClick={() => onClose(id)}></button>
      </div>
    </div>
  );
};

export default ToastNotification;