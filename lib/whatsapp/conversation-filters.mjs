export const MANUAL_UNREAD_AT = "1970-01-01T00:00:00.000Z";

// El bot y el asesor no generan pendientes de lectura: solo el prospecto.
export function isConvUnread(conv, lastUserMsgAt) {
  if (conv.visto_at && new Date(conv.visto_at).getTime() === 0) return true;
  if (!lastUserMsgAt) return false;
  if (!conv.visto_at) return true;
  return new Date(lastUserMsgAt).getTime() > new Date(conv.visto_at).getTime();
}

export function matchesConversationInbox(conv, lastUserMsgAt, filter) {
  if (filter === "no_leidas") return isConvUnread(conv, lastUserMsgAt);
  if (filter === "por_seguir") return conv.seguimiento_manual === true;
  return true;
}
