"use client";

export default function NewLeadModal({
  showForm,
  setShowForm,
  newLead,
  setNewLead,
  CURSOS,
  vendedores,
  addLead,
}) {
  if (!showForm) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowForm(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 24 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: "#E8A838", letterSpacing: 2, marginBottom: 20 }}>NUEVO LEAD</div>
          <div style={{ display: "grid", gap: 14 }}>
            {[
              { label: "NOMBRE *", key: "nombre", placeholder: "Nombre completo" },
              { label: "EMAIL *", key: "email", placeholder: "correo@email.com" },
              { label: "WHATSAPP", key: "whatsapp", placeholder: "+52 55 XXXX XXXX" },
              { label: "VALOR ESTIMADO ($)", key: "valor", placeholder: "0" },
            ].map((f) => (
              <div key={f.key}>
                <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>{f.label}</div>
                <input
                  className="input"
                  placeholder={f.placeholder}
                  value={newLead[f.key]}
                  onChange={(e) => setNewLead((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>CURSO INTERESADO</div>
              <select className="select" value={newLead.curso} onChange={(e) => setNewLead((p) => ({ ...p, curso: e.target.value }))}>
                {CURSOS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>ASIGNAR A VENDEDOR</div>
              <select className="select" value={newLead.asignado_a} onChange={(e) => setNewLead((p) => ({ ...p, asignado_a: e.target.value }))}>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nombre || v.email} {v.rol === "admin" ? "(admin)" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>NOTAS INICIALES</div>
              <textarea className="input" placeholder="¿De dónde llegó? ¿Qué necesita?" value={newLead.notas}
                onChange={(e) => setNewLead((p) => ({ ...p, notas: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={addLead}>AGREGAR LEAD →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
