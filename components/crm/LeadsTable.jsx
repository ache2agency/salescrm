"use client";

export default function LeadsTable({
  filteredLeads,
  STAGES,
  setSelectedLead,
  formatPeso,
  getNombreVendedor,
  openWA,
  normalizeStage,
}) {
  return (
    <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
            {["NOMBRE", "CURSO", "ETAPA", "VALOR", "ASIGNADO A", "FECHA", "ACCIONES"].map((h) => (
              <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, color: "#555", letterSpacing: 1.5, fontWeight: 500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredLeads.map((lead) => {
            const stage = STAGES.find((s) => s.id === normalizeStage(lead.stage));
            return (
              <tr
                key={lead.id}
                style={{ borderBottom: "1px solid #1e1e1e", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#1e1e1e"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                onClick={() => setSelectedLead(lead)}
              >
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 500, color: "#e8e8e8" }}>{lead.nombre}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{lead.email}</div>
                </td>
                <td style={{ padding: "12px 16px", color: "#aaa", fontSize: 12 }}>{lead.curso}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span className="tag" style={{ background: stage?.color + "22", color: stage?.color }}>{stage?.label}</span>
                </td>
                <td style={{ padding: "12px 16px", color: stage?.color, fontWeight: 600 }}>{formatPeso(lead.valor)}</td>
                <td style={{ padding: "12px 16px", color: "#aaa", fontSize: 12 }}>{getNombreVendedor(lead.asignado_a)}</td>
                <td style={{ padding: "12px 16px", color: "#555", fontSize: 11 }}>{lead.fecha}</td>
                <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-wa" onClick={() => openWA(lead)}>WA</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
