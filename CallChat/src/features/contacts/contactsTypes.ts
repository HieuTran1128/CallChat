export interface ContactUser {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  status: string
}

export interface ContactRecord {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED'
  participants: ContactUser[]
  requestedBy: ContactUser
}

export interface ContactRequests {
  incoming: ContactRecord[]
  outgoing: ContactRecord[]
}
