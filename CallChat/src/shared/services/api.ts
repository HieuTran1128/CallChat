export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
import { tokenStorage } from './storage'
interface ApiError { message?: string | string[] }
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    const token = tokenStorage.get()
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(!(options.body instanceof FormData) && {
          'Content-Type': 'application/json',
        }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    })
  }
  catch { throw new Error('Không kết nối được backend. Hãy kiểm tra server đang chạy.') }
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError
    const message = Array.isArray(error.message) ? error.message.join('. ') : error.message
    throw new Error(message ?? 'Yêu cầu không thành công')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
