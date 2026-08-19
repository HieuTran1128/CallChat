const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
interface ApiError { message?: string | string[] }
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try { response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }) }
  catch { throw new Error('Không kết nối được backend. Hãy kiểm tra server đang chạy.') }
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError
    const message = Array.isArray(error.message) ? error.message.join('. ') : error.message
    throw new Error(message ?? 'Yêu cầu không thành công')
  }
  return response.json() as Promise<T>
}
