export function createStableQrUrl() {
  const token = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${window.location.origin}/qr/${token}`;
}
