"use client";
import { useState } from "react";

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
  const [mobileView, setMobileView] = useState("list"); // 'list' | 'chat'

  const handleSelectConv = async (c) => {
    if (c.id === selectedConv?.id) return;
    await confirmReturnToBotIfNeeded(async () => {
      setSelectedConv(c);
      await fetchConvMessages(c.id);
      setAgentMessage("");
      setMobileView("chat");
    });
  };

  return (
    <>
      <style>{`
        .convs-grid { display: grid; grid-template-columns: 1.1fr 1.4fr; gap: 18px; }
        .convs-filters { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .conv-back-btn { display: none; }
        @media (max-width: 768px) {
          .convs-grid { grid-template-columns: 1fr !important; }
          .convs-list-panel { display: ${mobileView === "list" ? "block" : "none"} !important; }
          .convs-chat-panel { display: ${mobileView === "chat" ? "flex" : "none"} !important; }
          .convs-filters { grid-template-columns: 1fr !important; }
          .conv-back-btn { display: flex !important; align-items: center; gap: 6px; background: none; border: none; color: #E8A838; font-size: 13px; cursor: pointer; padding: 0 0 12px 0; }
        }
      `}</style>

      <div className="convs-grid">
        {/* LISTA */}
        <div className="convs-list-panel" style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 4 }}>CONVERSACIONES WHATSAPP</div>
          <div style={{ fontSize: 11, color: "#777", marginBottom: 12 }}>Últimos chats que han llegado por WhatsApp.</div>
          <div className="convs-filters">
            <input
              value={convSearch}
              onChange={(e) => setConvSearch(e.target.value)}
              placeholder="Buscar..."
              style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "8px 10px", color: "#e0e0e0", fontSize: 12 }}
            />
            <select
              value={convModeFilter}
              onChange={(e) => setConvModeFilter(e.target.value)}
              style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "8px 10px", color: "#e0e0e0", fontSize: 12 }}
            >
              <option value="todos">Todos los modos</option>
              <option value="bot">Solo BOT</option>
              <option value="humano">Solo humano</option>
            </select>
            <select
              value={convPhaseFilter}
              onChange={(e) => setConvPhaseFilter(e.target.value)}
              style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "8px 10px", color: "#e0e0e0", fontSize: 12 }}
            >
              {conversationPhaseOptions.map((phase) => (
                <option key={phase} value={phase}>
                  {phase === "todas" ? "Todas las fases" : getPhaseLabel(phase)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 11, color: "#777", marginBottom: 10 }}>{filteredWhatsConvs.length} conversaciones</div>
          {filteredWhatsConvs.length === 0 ? (
            <div style={{ padding: 20, borderRadius: 8, border: "1px dashed #333", textAlign: "center", color: "#555", fontSize: 12 }}>
              No hay conversaciones que coincidan.
            </div>
          ) : (
            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {filteredWhatsConvs.map((c) => {
                const linkedLead = leads.find((lead) => lead.id === c.lead_id);
                const owner = vendedores.find((v) => v.id === c.tomado_por);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConv(c)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #2a2a2a",
                      marginBottom: 8,
                      cursor: "pointer",
                      background: selectedConv?.id === c.id ? "#222" : "#161616",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 12, color: "#e0e0e0" }}>{linkedLead?.nombre || c.whatsapp}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span style={{ ...getConversationBadgeStyle("mode", c.modo_humano), borderRadius: 999, padding: "2px 8px", fontSize: 10 }}>
                          {getModeLabel(c)}
                        </span>
                        <span style={{ ...getConversationBadgeStyle("phase", c.fase), borderRadius: 999, padding: "2px 8px", fontSize: 10 }}>
                          {getPhaseLabel(c.fase)}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>
                      {c.whatsapp} · {c.ultimo_mensaje_at?.slice(0, 16) ?? ""}
                    </div>
                    {owner && (
                      <div style={{ fontSize: 10, color: "#777", marginTop: 2 }}>Tomada por: {owner.nombre || owner.email}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CHAT */}
        <div className="convs-chat-panel" style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: 16, minHeight: 260, display: "flex", flexDirection: "column", gap: 10 }}>
          {!selectedConv ? (
            <div style={{ fontSize: 12, color: "#555" }}>Selecciona una conversación para ver el historial.</div>
          ) : (
            <>
              <button className="conv-back-btn" onClick={() => setMobileView("list")}>
                ← Conversaciones
              </button>

              <div style={{ marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#e0e0e0" }}>Chat con</div>
                  <div style={{ fontSize: 13, color: "#E8A838" }}>{selectedConvLead?.nombre || selectedConv.whatsapp}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    <span style={{ ...getConversationBadgeStyle("mode", selectedConv.modo_humano), borderRadius: 999, padding: "3px 10px", fontSize: 10 }}>
                      {getModeLabel(selectedConv)}
                    </span>
                    <span style={{ ...getConversationBadgeStyle("phase", selectedConv.fase), borderRadius: 999, padding: "3px 10px", fontSize: 10 }}>
                      {getPhaseLabel(selectedConv.fase)}
                    </span>
                    <span style={{ background: "#1a1a1a", color: "#aaa", border: "1px solid #333", borderRadius: 999, padding: "3px 10px", fontSize: 10 }}>
                      {selectedConv.estado || "—"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>
                    {selectedConv.ultimo_mensaje_at?.slice(0, 16) ?? "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="btn"
                    style={{
                      background: selectedConv.modo_humano ? "#1a1a1a" : "#E8A838",
                      border: "1px solid #333",
                      color: selectedConv.modo_humano ? "#e0e0e0" : "#0e0e0e",
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                    onClick={() => setHumanMode(selectedConv, true)}
                    disabled={selectedConv.modo_humano}
                  >
                    Tomar control
                  </button>
                  <button
                    className="btn"
                    style={{
                      background: selectedConv.modo_humano ? "#E8A838" : "#1a1a1a",
                      border: "1px solid #333",
                      color: selectedConv.modo_humano ? "#0e0e0e" : "#e0e0e0",
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 11,
                      cursor: "pointer",
                      opacity: selectedConv.modo_humano ? 1 : 0.5,
                    }}
                    onClick={() => setHumanMode(selectedConv, false)}
                    disabled={!selectedConv.modo_humano}
                  >
                    Volver a BOT
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 6 }}>
                <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: 10, background: "#131313" }}>
                  <div style={{ fontSize: 10, color: "#777", letterSpacing: 1, marginBottom: 6 }}>LEAD</div>
                  {selectedConvLead ? (
                    <>
                      <div style={{ fontSize: 12, color: "#e0e0e0" }}>{selectedConvLead.nombre || "Sin nombre"}</div>
                      <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>{selectedConvLead.email || "Sin email"}</div>
                      <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>{selectedConvLead.curso || "—"}</div>
                      <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>Stage: {selectedConvLead.stage || "—"}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: "#555" }}>Sin lead ligado.</div>
                  )}
                </div>
                <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, padding: 10, background: "#131313" }}>
                  <div style={{ fontSize: 10, color: "#777", letterSpacing: 1, marginBottom: 6 }}>RESPONSABLE</div>
                  <div style={{ fontSize: 12, color: "#e0e0e0" }}>
                    {selectedConvOwner?.nombre || selectedConvOwner?.email || "Sin dueño"}
                  </div>
                  <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>
                    Asignado: {selectedLeadAssigned?.nombre || selectedLeadAssigned?.email || "—"}
                  </div>
                </div>
              </div>

              <div style={{ borderRadius: 8, border: "1px solid #2a2a2a", padding: 10, flex: 1, minHeight: 200, maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                {convMessages.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#555" }}>No hay mensajes registrados.</div>
                ) : (
                  convMessages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: m.rol === "usuario" ? "flex-start" : "flex-end",
                        maxWidth: "82%",
                        background: m.rol === "usuario" ? "#1f1f1f" : m.rol === "agente" ? "#2a3b4f" : "#E8A838",
                        color: m.rol === "usuario" ? "#e0e0e0" : "#0e0e0e",
                        borderRadius: 8,
                        padding: "6px 10px",
                        lineHeight: 1.5,
                        border: m.rol === "usuario" ? "1px solid #333" : "none",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      <div>{m.contenido}</div>
                      <div style={{ fontSize: 10, marginTop: 3, opacity: 0.7 }}>{m.created_at?.slice(0, 16) ?? ""}</div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, color: "#777", marginBottom: 4 }}>Responder como vendedor</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <textarea
                    value={agentMessage}
                    onChange={(e) => setAgentMessage(e.target.value)}
                    rows={2}
                    placeholder="Escribe tu respuesta..."
                    style={{ flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "6px 8px", color: "#e0e0e0", fontSize: 12, resize: "vertical", fontFamily: "inherit" }}
                  />
                  <button className="btn btn-primary" onClick={sendAgentReply} disabled={sendingAgent || !agentMessage.trim()}>
                    {sendingAgent ? "..." : "Enviar"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
