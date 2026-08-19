import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  fetchConversations,
  openDirectConversation,
  selectConversation,
} from "../features/conversations/conversationsSlice";
import { fetchMessages, sendMessage } from "../features/messages/messagesSlice";
import {
  joinConversation,
  markConversationRead,
  sendTyping,
  deleteRealtimeMessageForMe,
  editRealtimeMessage,
  reactRealtimeMessage,
  removeRealtimeMessage,
} from "../shared/services/socket";
import type { ChatMessage } from "../features/messages/messageTypes";
import { conversationNotificationsDismissed } from "../features/notifications/notificationsSlice";

export function ChatPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const currentUser = useAppSelector((state) => state.auth.user)!;
  const {
    items: conversations,
    activeId,
    status,
    error,
  } = useAppSelector((state) => state.conversations);
  const messagesState = useAppSelector((state) => state.messages);
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadedPageRef = useRef(1);
  const shouldStickToBottomRef = useRef(true);
  const active = conversations.find((item) => item.id === activeId);
  const messages = activeId
    ? (messagesState.byConversation[activeId] ?? [])
    : [];
  const otherUser = active?.participants.find(
    (user) => user.id !== currentUser.id,
  );
  const isTyping = activeId
    ? Boolean(messagesState.typingByConversation[activeId])
    : false;
  const page = activeId ? (messagesState.pages[activeId] ?? 1) : 1;
  const canLoadMore = activeId
    ? page < (messagesState.totalPages[activeId] ?? 0)
    : false;
  const filePreviews = useMemo(
    () =>
      selectedFiles.map((file) => ({
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
      })),
    [selectedFiles],
  );

  useEffect(
    () => () =>
      filePreviews.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }),
    [filePreviews],
  );

  useEffect(() => {
    void dispatch(fetchConversations());
  }, [dispatch]);
  useEffect(() => {
    const conversationId = params.get("conversationId");
    if (!conversationId) return;
    dispatch(selectConversation(conversationId));
    setParams({}, { replace: true });
  }, [dispatch, params, setParams]);
  useEffect(() => {
    const userId = params.get("userId");
    if (!userId) return;
    void dispatch(openDirectConversation(userId)).then(() =>
      setParams({}, { replace: true }),
    );
  }, [dispatch, params, setParams]);
  useEffect(() => {
    if (!activeId) return;
    dispatch(conversationNotificationsDismissed(activeId));
    loadedPageRef.current = 1;
    shouldStickToBottomRef.current = true;
    joinConversation(activeId);
    void dispatch(fetchMessages({ conversationId: activeId }));
  }, [activeId, dispatch]);
  useEffect(() => {
    const messageList = bottomRef.current?.parentElement;
    if (!messageList) return;
    const trackScrollPosition = () => {
      const distanceFromBottom =
        messageList.scrollHeight -
        messageList.scrollTop -
        messageList.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 80;
    };
    messageList.addEventListener("scroll", trackScrollPosition, {
      passive: true,
    });
    return () => messageList.removeEventListener("scroll", trackScrollPosition);
  }, [activeId]);
  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    markConversationRead(activeId);
    const messageList = bottomRef.current?.parentElement;
    if (
      messageList &&
      page <= loadedPageRef.current &&
      shouldStickToBottomRef.current
    ) {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior: "smooth",
      });
    }
    loadedPageRef.current = page;
  }, [activeId, messages.length, page]);
  useEffect(
    () => () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    },
    [],
  );

  function changeContent(value: string) {
    setContent(value);
    if (!activeId) return;
    sendTyping(activeId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(activeId, false), 900);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      !activeId ||
      (!content.trim() && selectedFiles.length === 0) ||
      messagesState.sending
    )
      return;
    const draft = content.trim();
    const files = selectedFiles;
    shouldStickToBottomRef.current = true;
    sendTyping(activeId, false);
    try {
      await dispatch(
        sendMessage({
          conversationId: activeId,
          content: draft,
          files,
          replyToId: replyTarget?.id,
        }),
      ).unwrap();
      setContent((current) => (current.trim() === draft ? "" : current));
      setSelectedFiles([]);
      setReplyTarget(null);
    } catch {
      // Redux giữ nội dung và thông báo lỗi để người dùng thử gửi lại.
    }
  }

  async function editMessage(message: ChatMessage) {
    const nextContent = window.prompt("Sửa tin nhắn", message.content);
    if (!nextContent?.trim() || nextContent.trim() === message.content) return;
    try { await editRealtimeMessage(message.id, nextContent.trim()); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Không thể sửa tin nhắn"); }
  }

  async function removeMessage(message: ChatMessage, forEveryone: boolean) {
    const question = forEveryone ? "Thu hồi tin nhắn cho mọi người?" : "Xóa tin nhắn ở phía bạn?";
    if (!window.confirm(question)) return;
    try {
      if (forEveryone) await removeRealtimeMessage(message.id);
      else await deleteRealtimeMessageForMe(message.id);
    } catch (error) { window.alert(error instanceof Error ? error.message : "Không thể xóa tin nhắn"); }
  }

  async function reactToMessage(messageId: string, emoji: string) {
    try {
      await reactRealtimeMessage(messageId, emoji);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Không thể thả cảm xúc");
    }
  }

  function chooseFiles(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).filter(
      (file) => file.size <= 10 * 1024 * 1024,
    );
    setSelectedFiles((current) => [...current, ...accepted].slice(0, 10));
  }

  return (
    <section className="chat-shell">
      <aside className="conversation-panel">
        <div className="conversation-heading">
          <h1>Trò chuyện</h1>
          <span>{conversations.length}</span>
        </div>
        {status === "loading" && conversations.length === 0 && (
          <p className="chat-placeholder">Đang tải...</p>
        )}
        {error && <p className="chat-error">{error}</p>}
        {conversations.map((conversation) => {
          const person = conversation.participants.find(
            (user) => user.id !== currentUser.id,
          );
          if (!person) return null;
          return (
            <button
              type="button"
              className={`conversation-item ${conversation.id === activeId ? "active" : ""}`}
              key={conversation.id}
              onClick={() => dispatch(selectConversation(conversation.id))}
            >
              <span className="chat-avatar">
                {person.avatarUrl ? (
                  <img src={person.avatarUrl} alt="" />
                ) : (
                  person.displayName[0].toUpperCase()
                )}
                <i className={person.status === "ONLINE" ? "online" : ""} />
              </span>
              <span className="conversation-copy">
                <strong>{person.displayName}</strong>
                <small className="conversation-preview">
                  <span>{conversation.lastMessage ? `${conversation.lastMessage.senderId === currentUser.id ? "Bạn: " : ""}${conversation.lastMessage.content || (conversation.lastMessage.type === "IMAGE" ? "Đã gửi ảnh" : "Đã gửi tệp")}` : `@${person.username}`}</span>
                  {conversation.lastMessage && <time>{new Date(conversation.lastMessage.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time>}
                </small>
              </span>
              {conversation.unreadCount > 0 && (
                <b className="unread-badge">
                  {conversation.unreadCount > 99
                    ? "99+"
                    : conversation.unreadCount}
                </b>
              )}
            </button>
          );
        })}
      </aside>
      <main className="message-panel">
        {active && otherUser ? (
          <>
            <header className="chat-header">
              <span className="chat-avatar">
                {otherUser.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt="" />
                ) : (
                  otherUser.displayName[0].toUpperCase()
                )}
                <i className={otherUser.status === "ONLINE" ? "online" : ""} />
              </span>
              <div>
                <strong>{otherUser.displayName}</strong>
                <small>
                  {isTyping
                    ? "Đang nhập..."
                    : otherUser.status === "ONLINE"
                      ? "Đang online"
                      : "Offline"}
                </small>
              </div>
              <div className="chat-call-actions">
                <button title="Gọi thoại" onClick={() => navigate(`/call/new?userId=${otherUser.id}&type=AUDIO`)}>📞</button>
                <button title="Gọi video" onClick={() => navigate(`/call/new?userId=${otherUser.id}&type=VIDEO`)}>📹</button>
              </div>
            </header>
            {!messagesState.connected && <div className="socket-notice">Đang kết nối lại...</div>}
            {messagesState.error && <div className="send-error">{messagesState.error}</div>}
            <div className="message-list">
              {canLoadMore && (
                <button
                  className="load-older"
                  onClick={() =>
                    void dispatch(
                      fetchMessages({
                        conversationId: active.id,
                        page: page + 1,
                      }),
                    )
                  }
                >
                  Tải tin nhắn cũ
                </button>
              )}
              {messages.map((message) => {
                const mine = message.senderId === currentUser.id;
                const receipt = message.readBy.length
                  ? "Đã xem"
                  : message.deliveredTo.length
                    ? "Đã nhận"
                    : "Đã gửi";
                return (
                  <div
                    className={`message-row ${mine ? "mine" : ""}`}
                    key={message.id}
                  >
                    <div className="message-bubble">
                      {(message.replyPreview || message.replyUnavailable) && (
                        <div className={`reply-quote ${message.replyUnavailable ? "unavailable" : ""}`}>
                          {message.replyUnavailable ? (
                            <span>Tin nhắn được trả lời không còn tồn tại</span>
                          ) : message.replyPreview ? (
                            <><b>{message.replyPreview.senderId === currentUser.id ? "Bạn" : otherUser?.displayName}</b><span>{message.replyPreview.content || (message.replyPreview.type === "IMAGE" ? "Ảnh" : "Tệp đính kèm")}</span></>
                          ) : null}
                        </div>
                      )}
                      {message.attachments.length > 0 && (
                        <div className="message-attachments">
                          {message.attachments.map((file) =>
                            file.resourceType === "image" ? (
                              <a href={file.url} target="_blank" rel="noreferrer" key={file.publicId}>
                                <img src={file.url} alt={file.name} />
                              </a>
                            ) : (
                              <a className="file-card" href={file.url} target="_blank" rel="noreferrer" key={file.publicId} download>
                                <b>📎</b><span>{file.name}<small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span>
                              </a>
                            ),
                          )}
                        </div>
                      )}
                      {message.content && <p>{message.content}</p>}
                      {message.editedAt && <em className="edited-label">đã sửa</em>}
                      <span>
                        {new Date(message.createdAt).toLocaleTimeString(
                          "vi-VN",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                        {mine ? ` · ${receipt}` : ""}
                      </span>
                      <div className="reaction-summary">
                        {Object.entries(message.reactions.reduce<Record<string, number>>((groups, reaction) => { groups[reaction.emoji] = (groups[reaction.emoji] ?? 0) + 1; return groups }, {})).map(([emoji, count]) => <button type="button" key={emoji} onClick={() => void reactToMessage(message.id, emoji)}>{emoji} {count}</button>)}
                      </div>
                      <div className="reaction-picker">
                        {['👍', '❤️', '😂'].map((emoji) => <button type="button" title={`Thả ${emoji}`} key={emoji} onClick={() => void reactToMessage(message.id, emoji)}>{emoji}</button>)}
                      </div>
                    </div>
                    <div className="message-side-actions">
                      <button type="button" onClick={() => setReplyTarget(message)}>Trả lời</button>
                      {mine && message.content && <button type="button" onClick={() => void editMessage(message)}>Sửa</button>}
                      <button type="button" onClick={() => void removeMessage(message, false)}>Xóa phía tôi</button>
                      {mine && <button type="button" className="danger" onClick={() => void removeMessage(message, true)}>Thu hồi</button>}
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="typing-bubble">
                  <i />
                  <i />
                  <i />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            {filePreviews.length > 0 && (
              <div className="attachment-preview-list">
                {filePreviews.map(({ file, previewUrl }, index) => (
                  <div className="attachment-preview" key={`${file.name}-${file.lastModified}`}>
                    {previewUrl ? <img src={previewUrl} alt={file.name} /> : <span>📎</span>}
                    <small>{file.name}</small>
                    <button type="button" onClick={() => setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button>
                  </div>
                ))}
              </div>
            )}
            {replyTarget && (
              <div className="reply-compose"><div><b>Đang trả lời</b><span>{replyTarget.content || (replyTarget.type === "IMAGE" ? "Ảnh" : "Tệp đính kèm")}</span></div><button type="button" onClick={() => setReplyTarget(null)}>×</button></div>
            )}
            <form className="message-compose" onSubmit={submit}>
              <label className="attach-button" title="Đính kèm ảnh hoặc file">
                ＋
                <input type="file" multiple onChange={(event) => { chooseFiles(event.target.files); event.target.value = "" }} />
              </label>
              <input
                value={content}
                disabled={messagesState.sending}
                maxLength={5000}
                onChange={(event) => changeContent(event.target.value)}
                placeholder="Nhập tin nhắn..."
              />
              <button disabled={(!content.trim() && selectedFiles.length === 0) || messagesState.sending}>
                {messagesState.sending ? "Đang gửi..." : "Gửi"}
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty">
            <span>💬</span>
            <strong>Chọn một cuộc trò chuyện</strong>
            <p>Bắt đầu từ nút “Nhắn tin” trong danh sách bạn bè.</p>
          </div>
        )}
      </main>
    </section>
  );
}
