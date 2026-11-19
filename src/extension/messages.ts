/** Messages between the page script and the extension's own background pieces. */
export type HostOp = 'status' | 'onDeviceStatus' | 'generate' | 'syncPull' | 'syncPush';

export interface HostRequest {
  target: 'pem-host';
  op: HostOp;
  payload?: unknown;
}

export type HostResponse = { ok: true; data: unknown } | { ok: false; error: { name: string; message: string } };

export interface BackgroundRequest {
  target: 'pem-bg';
  op: 'ensure-host';
}
