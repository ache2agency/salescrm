"use client";
import { useState, useRef, useEffect } from "react";

const WA_GREEN = "#075E54";
const WA_TEAL = "#128C7E";
const WA_BUBBLE_OUT = "#DCF8C6";
const WA_BUBBLE_IN = "#FFFFFF";
const WA_BG = "#E5DDD5";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
}

const AVATAR_COLORS = ["#A8263C","#2C4A8C","#128C7E","#7B5EA7","#D97706","#0891B2"];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "?").length; i++) h = (name.charCodeAt(i) + h * 31) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function ConversationsPanel({
  filteredWhatsConvs,
  convSearch,
  setConvSearch,
  convModeFilter,
  setConvModeFilter,
  convPhaseFilter,
  setConvPhaseFilter,
  conversationPhaseOptions,
  getPhaseLabel,
  selectedConv,
  setSelectedConv,
  confirmReturnToBotIfNeeded,
  fetchConvMessages,
  setAgentMessage,
  leads,
  vendedores,
  getConversationBadgeStyle,
  getModeLabel,
  selectedConvLead,
  selectedConvOwner,
  selectedLeadAssigned,
  setHumanMode,
  convMessages,
  agentMessage,
  sendAgentReply,
  sendingAgent,
}) {
  const [mobileView, setMobileView] = useState("list");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMessages]);

  const handleSelectConv = async (c) => {
    if (c.id === selectedConv?.id) return;
    await confirmReturnToBotIfNeeded(async () => {
      setSelectedConv(c);
      await fetchConvMessages(c.id);
      setAgentMessage("");
      setMobileView("chat");
    });
  };

  const getDisplayName = (c) => {
    const lead = leads.find((l) => l.id === c.lead_id);
    return lead?.nombre || c.whatsapp;
  };

  const getModeColor = (c) => c.modo_humano ? "#A8263C" : WA_TEAL;
  const getModeIcon = (c) => c.modo_humano ? "👤" : "🤖";

  return (
    <>
      <style>{`
        .wa-root {
          display: grid;
          grid-template-columns: 360px 1fr;
          height: calc(100vh - 172px);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12);
        }

        /* LIST */
        .wa-list { display: flex; flex-direction: column; background: #fff; border-right: 1px solid #e9edef; }
        .wa-list-header { background: ${WA_GREEN}; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
        .wa-list-title { color: #fff; font-size: 17px; font-weight: 700; }
        .wa-search { padding: 8px 12px; background: #f0f2f5; }
        .wa-search input { width: 100%; background: #fff; border: none; border-radius: 20px; padding: 8px 14px; font-size: 13px; color: #1a1a1a; outline: none; box-sizing: border-box; }
        .wa-filters { padding: 6px 12px; display: flex; gap: 6px; border-bottom: 1px solid #e9edef; }
        .wa-filters select { flex: 1; background: #f0f2f5; border: none; border-radius: 12px; padding: 5px 8px; font-size: 11px; color: #54656f; outline: none; }
        .wa-convs-count { padding: 5px 16px; font-size: 11px; color: #8696a0; }
        .wa-list-items { flex: 1; overflow-y: auto; }
        .wa-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; border-bottom: 1px solid #f0f2f5; transition: background 0.1s; }
        .wa-item:hover { background: #f5f6f6; }
        .wa-item.active { background: #f0f2f5; }
        .wa-avatar { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .wa-item-body { flex: 1; min-width: 0; }
        .wa-item-row1 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
        .wa-item-name { font-size: 14px; font-weight: 600; color: #111b21; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; }
        .wa-item-time { font-size: 11px; color: #8696a0; flex-shrink: 0; }
        .wa-item-row2 { display: flex; align-items: center; gap: 6px; }
        .wa-item-preview { font-size: 12px; color: #667781; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        .wa-badge { font-size: 10px; border-radius: 999px; padding: 1px 7px; font-weight: 600; flex-shrink: 0; }

        /* CHAT */
        .wa-chat { display: flex; flex-direction: column; background: ${WA_BG}; position: relative; min-height: 0; overflow: hidden; }
        .wa-chat-header { background: ${WA_GREEN}; padding: 10px 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; z-index: 1; }
        .wa-back-btn { background: none; border: none; color: #fff; font-size: 22px; cursor: pointer; padding: 0; display: none; line-height: 1; }
        .wa-chat-header-info { flex: 1; min-width: 0; }
        .wa-chat-name { color: #fff; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wa-chat-sub { color: rgba(255,255,255,0.72); font-size: 11px; margin-top: 1px; }
        .wa-chat-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .wa-ctrl-btn { border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 600; border: none; cursor: pointer; }
        .wa-ctrl-btn:disabled { opacity: 0.35; cursor: default; }

        /* info cards */
        .wa-info-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 8px 12px; flex-shrink: 0; z-index: 1; }
        .wa-info-card { background: rgba(255,255,255,0.88); border-radius: 8px; padding: 8px 10px; }
        .wa-info-card-title { font-size: 9px; color: #8696a0; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 4px; font-weight: 700; }

        /* messages */
        .wa-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 10px 14px; display: flex; flex-direction: column; gap: 3px; z-index: 1; }
        .wa-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #8696a0; font-size: 13px; }
        .wa-msg { max-width: 75%; padding: 6px 10px 18px; border-radius: 8px; position: relative; word-break: break-word; white-space: pre-wrap; font-size: 13.5px; line-height: 1.45; box-shadow: 0 1px 2px rgba(0,0,0,0.12); margin-bottom: 1px; }
        .wa-msg.in  { align-self: flex-start; background: ${WA_BUBBLE_IN}; border-top-left-radius: 2px; margin-left: 8px; color: #111b21; }
        .wa-msg.out { align-self: flex-end;   background: ${WA_BUBBLE_OUT}; border-top-right-radius: 2px; margin-right: 8px; color: #111b21; }
        .wa-msg.in::before  { content:''; position:absolute; top:0; left:-8px; border:8px solid transparent; border-top-color:${WA_BUBBLE_IN}; border-right-color:${WA_BUBBLE_IN}; }
        .wa-msg.out::after  { content:''; position:absolute; top:0; right:-8px; border:8px solid transparent; border-top-color:${WA_BUBBLE_OUT}; border-left-color:${WA_BUBBLE_OUT}; }
        .wa-msg-role { font-size: 10px; font-weight: 700; margin-bottom: 3px; }
        .wa-msg-time { position:absolute; bottom:4px; right:8px; font-size:10px; color:#8696a0; }
        .wa-msg.out .wa-msg-time { color: #6a9e7a; }

        /* input */
        .wa-input-bar { padding: 8px 12px; background: #f0f2f5; display: flex; align-items: flex-end; gap: 8px; flex-shrink: 0; z-index: 1; }
        .wa-input-bar textarea { flex:1; background:#fff; border:none; border-radius:20px; padding:10px 14px; font-size:14px; color:#111b21; resize:none; outline:none; font-family:inherit; max-height:120px; line-height:1.4; }
        .wa-send-btn { width:44px; height:44px; border-radius:50%; background:${WA_GREEN}; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.15s; }
        .wa-send-btn:hover:not(:disabled) { background:${WA_TEAL}; }
        .wa-send-btn:disabled { opacity:0.45; cursor:default; }

        /* placeholder */
        .wa-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:12px; color:#8696a0; }
        .wa-placeholder-icon { font-size:64px; opacity:0.25; }

        /* mobile */
        @media (max-width: 768px) {
          .wa-root { grid-template-columns: 1fr; height: calc(100vh - 130px); }
          .wa-list { display: ${mobileView === "list" ? "flex" : "none"}; }
          .wa-chat { display: ${mobileView === "chat" ? "flex" : "none"}; }
          .wa-back-btn { display: block !important; }
          .wa-info-cards { grid-template-columns: 1fr; }
          .wa-msg { max-width: 85%; }
        }
      `}</style>

      <div className="wa-root">

        {/* ── LISTA ── */}
        <div className="wa-list">
          <div className="wa-list-header">
            <span className="wa-list-title">Chats Windsor</span>
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>WhatsApp</span>
          </div>

          <div className="wa-search">
            <input
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="🔍  Buscar..."
            />
          </div>

          <div className="wa-filters">
            <select value={convModeFilter} onChange={(e) => setConvModeFilter(e.target.value)}>
              <option value="todos">Todos los modos</option>
              <option value="bot">Solo BOT</option>
              <option value="humano">Solo humano</option>
            </select>
            <select value={convPhaseFilter} onChange={(e) => setConvPhaseFilter(e.target.value)}>
              {conversationPhaseOptions.map((p) => (
                <option key={p} value={p}>{p === "todas" ? "Todas las fases" : getPhaseLabel(p)}</option>
              ))}
            </select>
          </div>

          <div className="wa-convs-count">{filteredWhatsConvs.length} conversaciones</div>

          <div className="wa-list-items">
            {filteredWhatsConvs.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#8696a0", fontSize: 13 }}>Sin conversaciones</div>
            ) : (
              filteredWhatsConvs.map((c) => {
                const name = getDisplayName(c);
                const owner = vendedores.find((v) => v.id === c.tomado_por);
                const time = c.ultimo_mensaje_at
                  ? new Date(c.ultimo_mensaje_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
                  : "";
                return (
                  <div
                    key={c.id}
                    className={`wa-item${selectedConv?.id === c.id ? " active" : ""}`}
                    onClick={() => handleSelectConv(c)}
                  >
                    <div className="wa-avatar" style={{ background: avatarColor(name) }}>
                      {getInitials(name)}
                    </div>
                    <div className="wa-item-body">
                      <div className="wa-item-row1">
                        <span className="wa-item-name">{name}</span>
                        <span className="wa-item-time">{time}</span>
                      </div>
                      <div className="wa-item-row2">
                        <span className="wa-item-preview">{getModeIcon(c)} {c.whatsapp}</span>
                        <span className="wa-badge" style={{ background: getModeColor(c) + "22", color: getModeColor(c) }}>
                          {getPhaseLabel(c.fase)}
                        </span>
                      </div>
                      {owner && (
                        <div style={{ fontSize: 10, color: "#8696a0", marginTop: 1 }}>{owner.nombre || owner.email}</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── CHAT ── */}
        <div className="wa-chat">
          {!selectedConv ? (
            <div className="wa-placeholder">
              <div className="wa-placeholder-icon">💬</div>
              <div style={{ fontSize: 14 }}>Selecciona una conversación</div>
            </div>
          ) : (
            <>
              <div className="wa-chat-header">
                <button className="wa-back-btn" onClick={() => setMobileView("list")}>←</button>
                <div className="wa-avatar" style={{ width: 38, height: 38, fontSize: 13, flexShrink: 0, background: avatarColor(selectedConvLead?.nombre || selectedConv.whatsapp) }}>
                  {getInitials(selectedConvLead?.nombre || selectedConv.whatsapp)}
                </div>
                <div className="wa-chat-header-info">
                  <div className="wa-chat-name">{selectedConvLead?.nombre || selectedConv.whatsapp}</div>
                  <div className="wa-chat-sub">{getModeLabel(selectedConv)} · {getPhaseLabel(selectedConv.fase)}</div>
                </div>
                <div className="wa-chat-actions">
                  <button
                    className="wa-ctrl-btn"
                    style={{ background: selectedConv.modo_humano ? "rgba(255,255,255,0.15)" : "#fff", color: selectedConv.modo_humano ? "rgba(255,255,255,0.35)" : WA_GREEN }}
                    onClick={() => setHumanMode(selectedConv, true)}
                    disabled={selectedConv.modo_humano}
                  >
                    Tomar
                  </button>
                  <button
                    className="wa-ctrl-btn"
                    style={{ background: selectedConv.modo_humano ? "#A8263C" : "rgba(255,255,255,0.15)", color: "#fff" }}
                    onClick={() => setHumanMode(selectedConv, false)}
                    disabled={!selectedConv.modo_humano}
                  >
                    BOT
                  </button>
                </div>
              </div>

              <div className="wa-info-cards">
                <div className="wa-info-card">
                  <div className="wa-info-card-title">Lead</div>
                  <div style={{ fontWeight: 600, color: "#111b21", fontSize: 12 }}>{selectedConvLead?.nombre || "Sin nombre"}</div>
                  <div style={{ color: "#667781", fontSize: 11, marginTop: 2 }}>{selectedConvLead?.email || "Sin email"}</div>
                  <div style={{ color: "#667781", fontSize: 11 }}>{selectedConvLead?.curso || "—"}</div>
                  <div style={{ color: "#667781", fontSize: 11 }}>Stage: {selectedConvLead?.stage || "—"}</div>
                </div>
                <div className="wa-info-card">
                  <div className="wa-info-card-title">Responsable</div>
                  <div style={{ fontWeight: 600, color: "#111b21", fontSize: 12 }}>{selectedConvOwner?.nombre || selectedConvOwner?.email || "Sin dueño"}</div>
                  <div style={{ color: "#667781", fontSize: 11, marginTop: 2 }}>Asignado: {selectedLeadAssigned?.nombre || selectedLeadAssigned?.email || "—"}</div>
                  <div style={{ color: "#667781", fontSize: 11, marginTop: 2 }}>{selectedConv.whatsapp}</div>
                </div>
              </div>

              <div className="wa-messages">
                {convMessages.length === 0 ? (
                  <div className="wa-empty">Sin mensajes registrados</div>
                ) : (
                  convMessages.map((m) => {
                    const isOut = m.rol === "bot" || m.rol === "agente";
                    const time = m.created_at?.slice(11, 16) ?? "";
                    return (
                      <div key={m.id} className={`wa-msg ${isOut ? "out" : "in"}`}>
                        {m.rol === "agente" && <div className="wa-msg-role" style={{ color: "#A8263C" }}>Vendedor</div>}
                        {m.rol === "bot" && <div className="wa-msg-role" style={{ color: WA_TEAL }}>Bot</div>}
                        {m.contenido}
                        <div className="wa-msg-time">{time}</div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="wa-input-bar">
                <textarea
                  value={agentMessage}
                  onChange={(e) => setAgentMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!sendingAgent && agentMessage.trim()) sendAgentReply();
                    }
                  }}
                  rows={1}
                  placeholder="Escribe un mensaje..."
                />
                <button
                  className="wa-send-btn"
                  onClick={sendAgentReply}
                  disabled={sendingAgent || !agentMessage.trim()}
                >
                  <span style={{ color: "#fff", fontSize: 18 }}>{sendingAgent ? "⏳" : "➤"}</span>
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </>
  );
}
