import { apiRequest } from '../../shared/services/api'
import type { ContactRecord, ContactRequests, ContactUser } from './contactsTypes'

type ApiUser = Omit<ContactUser, 'id'> & { id?: string; _id?: string }
type ApiContact = Omit<ContactRecord, 'id' | 'participants' | 'requestedBy'> & {
  id?: string
  _id?: string
  participants: ApiUser[]
  requestedBy: ApiUser | string
}

function normalizeUser(user: ApiUser): ContactUser {
  return { ...user, id: user.id ?? user._id ?? '' }
}

function normalizeContact(contact: ApiContact): ContactRecord {
  const requestedBy = typeof contact.requestedBy === 'string'
    ? { id: contact.requestedBy, username: '', displayName: '', status: 'OFFLINE' }
    : normalizeUser(contact.requestedBy)
  return {
    ...contact,
    id: contact.id ?? contact._id ?? '',
    participants: contact.participants.map(normalizeUser),
    requestedBy,
  }
}

export const contactsService = {
  searchUsers: (query: string) =>
    apiRequest<ApiUser[]>(`/users/search?q=${encodeURIComponent(query)}`).then(
      (users) => users.map(normalizeUser),
    ),
  sendRequest: (userId: string) =>
    apiRequest<ApiContact>(`/contacts/requests/${userId}`, { method: 'POST' }).then(normalizeContact),
  getRequests: async (): Promise<ContactRequests> => {
    const [incoming, outgoing] = await Promise.all([
      apiRequest<ApiContact[]>('/contacts/requests/incoming'),
      apiRequest<ApiContact[]>('/contacts/requests/outgoing'),
    ])
    return {
      incoming: incoming.map(normalizeContact),
      outgoing: outgoing.map(normalizeContact),
    }
  },
  acceptRequest: (contactId: string) =>
    apiRequest<ApiContact>(`/contacts/requests/${contactId}/accept`, { method: 'PATCH' }).then(normalizeContact),
  rejectRequest: (contactId: string) =>
    apiRequest<ApiContact>(`/contacts/requests/${contactId}/reject`, { method: 'PATCH' }).then(normalizeContact),
  cancelRequest: (contactId: string) =>
    apiRequest<void>(`/contacts/requests/${contactId}`, { method: 'DELETE' }),
  getFriends: () =>
    apiRequest<ApiContact[]>('/contacts/friends').then((contacts) =>
      contacts.map(normalizeContact),
    ),
  removeFriend: (userId: string) =>
    apiRequest<void>(`/contacts/friends/${userId}`, { method: 'DELETE' }),
  blockUser: (userId: string) =>
    apiRequest<ApiContact>(`/contacts/blocks/${userId}`, { method: 'POST' }).then(
      normalizeContact,
    ),
  getBlocked: () =>
    apiRequest<ApiContact[]>('/contacts/blocked').then((contacts) =>
      contacts.map(normalizeContact),
    ),
  unblockUser: (userId: string) =>
    apiRequest<void>(`/contacts/blocks/${userId}`, { method: 'DELETE' }),
}
