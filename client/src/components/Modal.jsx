import { useEffect } from 'react';
export default function Modal({ onClose, children, wide }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-3 overflow-y-auto bg-[rgba(0,0,0,.6)] backdrop-blur-sm animate-pop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} my-4 animate-pop`}>{children}</div>
    </div>
  );
}
