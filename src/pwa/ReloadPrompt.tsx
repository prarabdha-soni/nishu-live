import { useRegisterSW } from 'virtual:pwa-register/react';

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="sw-toast" role="status">
      <span>Update available</span>
      <button className="sw-refresh" onClick={() => updateServiceWorker(true)}>
        Refresh
      </button>
      <button className="sw-dismiss" aria-label="Dismiss" onClick={() => setNeedRefresh(false)}>
        ✕
      </button>
    </div>
  );
}
