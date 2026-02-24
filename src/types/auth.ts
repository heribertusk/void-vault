export interface User {
  id: string
  email: string
  is_admin: boolean
  unlimited_upload: boolean
  created_at: string
}

export interface UserWithPassword extends User {
  password_hash: string
  password_salt: string
}

export interface Session {
  user_id: string
  token_hash: string
  expires_at: string
}

export interface AuthContext {
  user: User
  sessionToken: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface CreateUserRequest {
  email: string
  password: string
  unlimited_upload?: boolean
}

export interface UpdateUserRequest {
  unlimited_upload?: boolean
}
