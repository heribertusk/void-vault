export interface TrustedDevice {
  id: string
  user_id: string
  device_name: string
  token_hash: string
  device_fingerprint: string
  status: 'active' | 'revoked'
  last_used: string
  created_at: string
}

export interface PendingDevice {
  id: string
  device_name: string
  device_fingerprint: string
  requested_by: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface DeviceRegistrationRequest {
  device_name: string
  device_fingerprint: string
  user_email: string
}

export interface DeviceApprovalRequest {
  approved: boolean
}

export interface DeviceTokenResponse {
  device_token: string
  device_name: string
  expires_at: string
}

export interface DeviceContext {
  deviceId: string
  userId: string
  deviceName: string
  unlimitedUpload: boolean
}
