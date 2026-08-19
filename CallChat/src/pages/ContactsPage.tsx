import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import {
  acceptFriendRequest,
  cancelFriendRequest,
  clearSearch,
  fetchFriendRequests,
  fetchFriends,
  removeFriend,
  blockUser,
  fetchBlockedUsers,
  unblockUser,
  rejectFriendRequest,
  searchUsers,
  sendFriendRequest,
} from '../features/contacts/contactsSlice'
import type { ContactRecord, ContactUser } from '../features/contacts/contactsTypes'
import { useDebounce } from '../shared/hooks/useDebounce'

type ContactTab = 'friends' | 'search' | 'incoming' | 'outgoing' | 'blocked'

export function ContactsPage() {
  const dispatch = useAppDispatch()
  const currentUserId = useAppSelector((state) => state.auth.user!.id)
  const contacts = useAppSelector((state) => state.contacts)
  const [tab, setTab] = useState<ContactTab>('friends')
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query.trim(), 450)

  useEffect(() => {
    if (debouncedQuery.length < 2) { dispatch(clearSearch()); return }
    void dispatch(searchUsers(debouncedQuery))
  }, [debouncedQuery, dispatch])

  useEffect(() => {
    void dispatch(fetchFriendRequests())
    void dispatch(fetchFriends())
    void dispatch(fetchBlockedUsers())
    const interval = window.setInterval(() => {
      void dispatch(fetchFriendRequests())
      void dispatch(fetchFriends())
      void dispatch(fetchBlockedUsers())
    }, 10_000)
    return () => window.clearInterval(interval)
  }, [dispatch])

  return <section className="contacts-page">
    <div className="page-title"><div><p className="eyebrow">Danh bạ</p><h1>Kết nối bạn bè</h1><p className="page-subtitle">Tìm kiếm và quản lý lời mời kết bạn của bạn.</p></div></div>
    <div className="contact-tabs">
      <button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>Bạn bè {contacts.friends.length > 0 && <span className="neutral">{contacts.friends.length}</span>}</button>
      <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}>Tìm người</button>
      <button className={tab === 'incoming' ? 'active' : ''} onClick={() => setTab('incoming')}>Đã nhận {contacts.incoming.length > 0 && <span>{contacts.incoming.length}</span>}</button>
      <button className={tab === 'outgoing' ? 'active' : ''} onClick={() => setTab('outgoing')}>Đã gửi</button>
      <button className={tab === 'blocked' ? 'active' : ''} onClick={() => setTab('blocked')}>Đã chặn</button>
    </div>
    {contacts.error && <div className="error-message"><span>!</span>{contacts.error}</div>}
    {tab === 'friends' && <FriendsPanel friends={contacts.friends} currentUserId={currentUserId} loading={contacts.friendsStatus === 'loading'} actionUserId={contacts.actionUserId} />}
    {tab === 'search' && <SearchPanel query={query} setQuery={setQuery} currentUserId={currentUserId} />}
    {tab === 'incoming' && <RequestPanel type="incoming" requests={contacts.incoming} currentUserId={currentUserId} loading={contacts.requestsStatus === 'loading'} actionId={contacts.actionContactId} />}
    {tab === 'outgoing' && <RequestPanel type="outgoing" requests={contacts.outgoing} currentUserId={currentUserId} loading={contacts.requestsStatus === 'loading'} actionId={contacts.actionContactId} />}
    {tab === 'blocked' && <BlockedPanel blocked={contacts.blocked} currentUserId={currentUserId} loading={contacts.blockedStatus === 'loading'} actionUserId={contacts.actionUserId} />}
  </section>
}

function BlockedPanel({ blocked, currentUserId, loading, actionUserId }: { blocked: ContactRecord[]; currentUserId: string; loading: boolean; actionUserId: string | null }) {
  const dispatch = useAppDispatch()
  if (loading && blocked.length === 0) return <div className="search-results"><Empty loading text="Đang tải danh sách đã chặn..." /></div>
  if (blocked.length === 0) return <div className="search-results"><Empty icon="🛡️" title="Chưa chặn người dùng nào" text="Những người bạn chặn sẽ xuất hiện tại đây." /></div>
  return <div className="search-results">{blocked.map((contact) => {
    const user = contact.participants.find((participant) => participant.id !== currentUserId) ?? contact.participants[0]
    const processing = actionUserId === user.id
    return <article className="user-result blocked-result" key={contact.id}><UserIdentity user={user} /><span className="blocked-label">Đã chặn</span><button className="unblock-button" type="button" disabled={processing} onClick={() => dispatch(unblockUser(user.id))}>{processing ? 'Đang bỏ chặn...' : 'Bỏ chặn'}</button></article>
  })}</div>
}

function FriendsPanel({ friends, currentUserId, loading, actionUserId }: { friends: ContactRecord[]; currentUserId: string; loading: boolean; actionUserId: string | null }) {
  const dispatch = useAppDispatch()
  if (loading && friends.length === 0) return <div className="search-results"><Empty loading text="Đang tải danh sách bạn bè..." /></div>
  if (friends.length === 0) return <div className="search-results"><Empty icon="🤝" title="Chưa có bạn bè" text="Tìm người hoặc chấp nhận lời mời để bắt đầu kết nối." /></div>

  function confirmRemove(user: ContactUser) {
    if (window.confirm(`Hủy kết bạn với ${user.displayName}?`)) void dispatch(removeFriend(user.id))
  }
  function confirmBlock(user: ContactUser) {
    if (window.confirm(`Chặn ${user.displayName}? Hai người sẽ không còn là bạn bè.`)) void dispatch(blockUser(user.id))
  }

  return <div className="search-results">{friends.map((contact) => {
    const friend = contact.participants.find((user) => user.id !== currentUserId) ?? contact.participants[0]
    const processing = actionUserId === friend.id
    return <article className="user-result friend-result" key={contact.id}><UserIdentity user={friend} /><span className={`presence-label ${friend.status === 'ONLINE' ? 'online' : ''}`}>{friend.status === 'ONLINE' ? 'Đang online' : 'Offline'}</span><div className="friend-actions"><Link className="chat-button" to={`/chat?userId=${friend.id}`}>Nhắn tin</Link><button className="more-button" type="button" disabled={processing} onClick={() => confirmRemove(friend)}>Hủy bạn</button><button className="block-button" type="button" disabled={processing} onClick={() => confirmBlock(friend)}>Chặn</button></div></article>
  })}</div>
}

function SearchPanel({ query, setQuery, currentUserId }: { query: string; setQuery: (value: string) => void; currentUserId: string }) {
  const dispatch = useAppDispatch()
  const { searchResults, searchStatus, sendingTo, sentUserIds, incoming, outgoing, friends } = useAppSelector((state) => state.contacts)
  const incomingUserIds = new Set(incoming.flatMap((contact) => contact.participants.filter((user) => user.id !== currentUserId).map((user) => user.id)))
  const outgoingUserIds = new Set(outgoing.flatMap((contact) => contact.participants.filter((user) => user.id !== currentUserId).map((user) => user.id)))
  const friendUserIds = new Set(friends.flatMap((contact) => contact.participants.filter((user) => user.id !== currentUserId).map((user) => user.id)))
  return <>
    <div className="people-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập ít nhất 2 ký tự..." autoFocus />{query && <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm">×</button>}</div>
    <div className="search-results">
      {searchStatus === 'loading' && <Empty loading text="Đang tìm người dùng..." />}
      {searchStatus === 'idle' && <Empty icon="👥" title="Tìm người bạn quen" text="Kết quả sẽ xuất hiện khi bạn nhập từ 2 ký tự." />}
      {searchStatus === 'succeeded' && searchResults.length === 0 && <Empty icon="⌕" title="Không tìm thấy kết quả" text="Thử username, tên hoặc email khác." />}
      {searchStatus === 'succeeded' && searchResults.map((user) => <UserResult key={user.id} user={user} sending={sendingTo === user.id} relationship={friendUserIds.has(user.id) ? 'friend' : incomingUserIds.has(user.id) ? 'incoming' : outgoingUserIds.has(user.id) || sentUserIds.includes(user.id) ? 'outgoing' : 'none'} onSend={() => dispatch(sendFriendRequest(user.id))} />)}
    </div>
  </>
}

function RequestPanel({ type, requests, currentUserId, loading, actionId }: { type: 'incoming' | 'outgoing'; requests: ContactRecord[]; currentUserId: string; loading: boolean; actionId: string | null }) {
  const dispatch = useAppDispatch()
  if (loading && requests.length === 0) return <div className="search-results"><Empty loading text="Đang tải lời mời..." /></div>
  if (requests.length === 0) return <div className="search-results"><Empty icon={type === 'incoming' ? '📨' : '📤'} title={type === 'incoming' ? 'Chưa có lời mời mới' : 'Chưa gửi lời mời nào'} text={type === 'incoming' ? 'Lời mời bạn nhận được sẽ xuất hiện tại đây.' : 'Các lời mời đang chờ sẽ xuất hiện tại đây.'} /></div>
  return <div className="search-results">{requests.map((contact) => {
    const otherUser = contact.participants.find((user) => user.id !== currentUserId) ?? contact.participants[0]
    const processing = actionId === contact.id
    return <article className="user-result request-result" key={contact.id}><UserIdentity user={otherUser} /><div className="request-actions">{type === 'incoming' ? <><button className="accept-button" disabled={processing} onClick={() => dispatch(acceptFriendRequest(contact.id))}>{processing ? 'Đang xử lý...' : 'Chấp nhận'}</button><button className="reject-button" disabled={processing} onClick={() => dispatch(rejectFriendRequest(contact.id))}>Từ chối</button></> : <button className="reject-button" disabled={processing} onClick={() => dispatch(cancelFriendRequest(contact.id))}>{processing ? 'Đang hủy...' : 'Hủy lời mời'}</button>}</div></article>
  })}</div>
}

function UserIdentity({ user }: { user: ContactUser }) {
  return <><div className="result-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.displayName.charAt(0).toUpperCase()}<span className={user.status === 'ONLINE' ? 'online' : ''} /></div><div className="result-info"><strong>{user.displayName}</strong><p>@{user.username}</p></div></>
}

function UserResult({ user, sending, relationship, onSend }: { user: ContactUser; sending: boolean; relationship: 'none' | 'incoming' | 'outgoing' | 'friend'; onSend: () => void }) {
  const hasRequest = relationship !== 'none'
  const label = relationship === 'friend' ? '✓ Bạn bè' : relationship === 'incoming' ? 'Đang chờ bạn phản hồi' : relationship === 'outgoing' ? 'Đã gửi lời mời' : '+ Thêm bạn'
  return <article className="user-result"><UserIdentity user={user} /><button className={`friend-button${hasRequest ? ' sent' : ''}${relationship === 'friend' ? ' accepted' : ''}`} type="button" disabled={sending || hasRequest} onClick={onSend}>{sending ? 'Đang gửi...' : label}</button></article>
}

function Empty({ icon, title, text, loading = false }: { icon?: string; title?: string; text: string; loading?: boolean }) {
  return <div className="contact-empty">{loading ? <div className="spinner" /> : <div className="empty-icon">{icon}</div>}{title && <strong>{title}</strong>}<p>{text}</p></div>
}
