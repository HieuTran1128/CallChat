const AUTH_TOKEN_KEY = 'callchat_token'
export const tokenStorage = {
  get: () => localStorage.getItem(AUTH_TOKEN_KEY),
  set: (token: string) => localStorage.setItem(AUTH_TOKEN_KEY, token),
  remove: () => localStorage.removeItem(AUTH_TOKEN_KEY),
}
