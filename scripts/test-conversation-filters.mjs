import assert from "node:assert/strict";
import { test } from "node:test";
import { isConvUnread, matchesConversationInbox, MANUAL_UNREAD_AT } from "../lib/whatsapp/conversation-filters.mjs";

const read = { visto_at: "2026-09-08T12:00:00Z", ultimo_mensaje_at: "2026-09-08T14:00:00Z" };

test("una respuesta posterior del bot no vuelve no leído un mensaje ya visto", () => {
  assert.equal(isConvUnread(read, "2026-09-08T11:00:00Z"), false);
  assert.equal(isConvUnread(read, "2026-09-08T12:00:00Z"), false);
  assert.equal(isConvUnread(read, "2026-09-08T13:00:00Z"), true);
});

test("sin lectura previa se necesita un mensaje del prospecto", () => {
  assert.equal(isConvUnread({ visto_at: null }, undefined), false);
  assert.equal(isConvUnread({ visto_at: null }, "2026-09-08T13:00:00Z"), true);
});

test("no leído manual persiste con el formato de timestamptz devuelto por Supabase", () => {
  for (const visto_at of [MANUAL_UNREAD_AT, "1970-01-01T00:00:00+00:00"]) {
    assert.equal(matchesConversationInbox({ visto_at }, undefined, "no_leidas"), true);
  }
});

test("abrir o responder conserva seguimiento hasta quitarlo manualmente", () => {
  const marked = { ...read, seguimiento_manual: true };
  assert.equal(matchesConversationInbox(marked, "2026-09-08T11:00:00Z", "por_seguir"), true);
  assert.equal(matchesConversationInbox(marked, "2026-09-08T11:00:00Z", "no_leidas"), false);
  assert.equal(matchesConversationInbox({ ...marked, seguimiento_manual: false }, undefined, "por_seguir"), false);
  assert.equal(matchesConversationInbox(read, undefined, "por_seguir"), false);
  assert.equal(matchesConversationInbox(read, undefined, "todas"), true);
});
