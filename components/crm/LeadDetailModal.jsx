"use client";

export default function LeadDetailModal({
  lead,
  stage,
  isAdmin,
  vendedores,
  getNombreVendedor,
  reasignarLead,
  STAGES,
  moveStage,
  setSelectedLead,
  updateNotas,
  WA_TEMPLATES,
  openWA,
  sendLeadInformation,
  sendingInfoLeadId,
  leadInfoDraft,
  setLeadInfoDraft,
  hasActiveConversation,
  getLeadNextStep,
  leadTimelineLoading,
  leadTimeline,
  setShowCitaForm,
  setNuevaCita,
  deleteLead,
}) {
  const currentStageId = stage?.id || lead.stage;

  return (
    <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "24px 24px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 26, color: "#e8e8e8", letterSpacing: 1 }}>{lead.nombre}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{lead.email} • {lead.whatsapp}</div>
            </div>
            <button className="btn btn-ghost" onClick={() => setSelectedLead(null)}>✕</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 6 }}>CURSO</div>
              <div style={{ fontSize: 13, color: "#e0e0e0" }}>{lead.curso}</div>
            </div>
            <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 6 }}>VALOR</div>
              <div style={{ fontSize: 18, color: stage?.color, fontFamily: "'Bebas Neue'", letterSpacing: 1 }}>{`$${Number(lead.valor).toLocaleString("es-MX")}`}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: "#131313", border: "1px solid #2a2a2a", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 8 }}>SIGUIENTE PASO</div>
              <div style={{ fontSize: 12, color: "#e0e0e0", lineHeight: 1.6 }}>{getLeadNextStep(lead)}</div>
            </div>
            <div style={{ background: "#131313", border: "1px solid #2a2a2a", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 8 }}>ULTIMA ACTIVIDAD</div>
              {leadTimelineLoading ? (
                <div style={{ fontSize: 12, color: "#777" }}>Cargando actividad...</div>
              ) : leadTimeline[0] ? (
                <>
                  <div style={{ fontSize: 12, color: "#e0e0e0" }}>{leadTimeline[0].title}</div>
                  <div style={{ fontSize: 11, color: "#777", marginTop: 4, lineHeight: 1.5 }}>{leadTimeline[0].detail}</div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#777" }}>Sin actividad reciente registrada.</div>
              )}
            </div>
          </div>

          {isAdmin ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 8 }}>ASIGNADO A</div>
              <select className="select" value={lead.asignado_a || ""} onChange={(e) => reasignarLead(lead.id, e.target.value)}>
                <option value="">Sin asignar</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nombre || v.email} {v.rol === "admin" ? "(admin)" : ""}</option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ marginBottom: 20, background: "#1a1a1a", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 4 }}>ASIGNADO A</div>
              <div style={{ fontSize: 13, color: "#e0e0e0" }}>{getNombreVendedor(lead.asignado_a)}</div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 8 }}>MOVER A ETAPA</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  className="btn"
                  style={{ background: currentStageId === s.id ? s.color : s.color + "18", color: currentStageId === s.id ? "#0e0e0e" : s.color, border: `1px solid ${s.color}44`, padding: "5px 10px", fontSize: 11 }}
                  onClick={() => { moveStage(lead.id, s.id); setSelectedLead({ ...lead, stage: s.id }); }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 8 }}>NOTAS</div>
            <textarea
              className="input"
              style={{ fontSize: 12, lineHeight: 1.5 }}
              value={lead.notas || ""}
              onChange={(e) => { updateNotas(lead.id, e.target.value); setSelectedLead({ ...lead, notas: e.target.value }); }}
              placeholder="Agrega notas sobre este lead..."
            />
          </div>

          <div style={{ marginBottom: 20, background: "#131313", border: "1px solid #2a2a2a", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 10 }}>TIMELINE</div>
            {leadTimelineLoading ? (
              <div style={{ fontSize: 12, color: "#777" }}>Cargando timeline...</div>
            ) : leadTimeline.length === 0 ? (
              <div style={{ fontSize: 12, color: "#777" }}>Todavia no hay eventos de seguimiento para este lead.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {leadTimeline.map((item) => (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "10px 1fr", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.tone, marginTop: 4 }} />
                    <div>
                      <div style={{ fontSize: 12, color: "#e0e0e0" }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: "#777", marginTop: 3, lineHeight: 1.5 }}>{item.detail}</div>
                      <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>{String(item.date || "").replace("T", " ").slice(0, 16)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {WA_TEMPLATES[currentStageId] && (
            <div style={{ marginBottom: 20, background: "#0d1e12", border: "1px solid #25D36644", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: "#25D366", letterSpacing: 1, marginBottom: 8 }}>MENSAJE SUGERIDO PARA WHATSAPP</div>
              <div style={{ fontSize: 11, color: "#777", lineHeight: 1.6, marginBottom: 8 }}>
                Puedes editar este mensaje antes de enviarlo. Si el lead aún no ha iniciado chat, para un primer contacto se necesita template aprobada.
              </div>
              <textarea
                className="input"
                style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 10, minHeight: 110 }}
                value={leadInfoDraft}
                onChange={(e) => setLeadInfoDraft(e.target.value)}
                placeholder="Escribe el mensaje que deseas enviar por WhatsApp..."
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 12, padding: "8px 16px" }}
                  onClick={() => sendLeadInformation(lead)}
                  disabled={sendingInfoLeadId === lead.id || !hasActiveConversation}
                  title={hasActiveConversation ? "Enviar por la API de WhatsApp" : "Este lead aún no ha iniciado chat; para primer contacto necesitas template aprobada"}
                >
                  {sendingInfoLeadId === lead.id ? "Enviando..." : "Enviar información"}
                </button>
                <button className="btn btn-wa" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => openWA(lead)}>
                  📱 Abrir en WhatsApp
                </button>
              </div>
              {!hasActiveConversation && (
                <div style={{ fontSize: 11, color: "#E8A838", marginTop: 8, lineHeight: 1.5 }}>
                  Este lead todavía no ha iniciado conversación con el bot. Para enviar un primer mensaje automático por WhatsApp necesitas una template aprobada.
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #222", display: "flex", justifyContent: "space-between" }}>
          <button
            className="btn"
            style={{ background: "#1a1a1a", color: "#E8A838", border: "1px solid #E8A83844", padding: "8px 16px", fontSize: 12 }}
            onClick={() => {
              setShowCitaForm(true);
              setNuevaCita((prev) => ({ ...prev, lead_id: lead.id }));
            }}
          >
            Agendar cita
          </button>
          {isAdmin && (
            <button
              className="btn"
              style={{ background: "#2a0d0d", color: "#E85D38", border: "1px solid #E85D3844", padding: "8px 16px", fontSize: 12 }}
              onClick={() => deleteLead(lead.id)}
            >
              Eliminar lead
            </button>
          )}
          <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setSelectedLead(null)}>Guardar y cerrar</button>
        </div>
      </div>
    </div>
  );
}
