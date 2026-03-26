"use client";

import { useState, useMemo } from "react";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TIPO_LABEL = {
  clase_prueba: "Clase de prueba",
  asesoria: "Asesoría",
  examen_ubicacion: "Examen de ubicación",
  inscripcion: "Inscripción",
};

export default function AgendaPanel({
  citas,
  setShowCitaForm,
  getCitaStatusStyle,
  updateCitaStatus,
}) {
  const today = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null); // date string "YYYY-MM-DD"
  const [selectedCita, setSelectedCita] = useState(null); // cita completa

  const isCurrentMonth =
    calYear === today.getFullYear() && calMonth === today.getMonth();

  const daysInMonth = useMemo(
    () => new Date(calYear, calMonth + 1, 0).getDate(),
    [calYear, calMonth]
  );
  const firstDayOfWeek = useMemo(
    () => new Date(calYear, calMonth, 1).getDay(),
    [calYear, calMonth]
  );

  const goPrevMonth = () => {
    if (isCurrentMonth) return;
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
    setSelectedDay(null);
  };

  const goNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
    setSelectedDay(null);
  };

  // Indexar citas por fecha "YYYY-MM-DD"
  const citasByDay = useMemo(() => {
    const map = {};
    citas.forEach((c) => {
      if (!c.fecha) return;
      const key = c.fecha.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [citas]);

  const citasDelDia = selectedDay ? (citasByDay[selectedDay] || []) : [];

  const renderCalendar = () => {
    const cells = [];

    DAY_LABELS.forEach((label) => (
      cells.push(
        <div key={`h-${label}`} style={{ fontSize: 10, color: "#555", textAlign: "center", paddingBottom: 4 }}>
          {label}
        </div>
      )
    ));

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(<div key={`e-${i}`} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const hasCitas = !!citasByDay[key]?.length;
      const count = citasByDay[key]?.length || 0;
      const isSelected = selectedDay === key;
      const isToday =
        d === today.getDate() &&
        calMonth === today.getMonth() &&
        calYear === today.getFullYear();

      cells.push(
        <button
          key={d}
          onClick={() => setSelectedDay(isSelected ? null : key)}
          style={{
            borderRadius: 6,
            padding: "5px 0",
            border: `1px solid ${isSelected ? "#E8A838" : isToday ? "#444" : "#2a2a2a"}`,
            background: isSelected ? "rgba(232,168,56,0.15)" : "transparent",
            color: isToday ? "#E8A838" : "#e0e0e0",
            fontSize: 11,
            cursor: "pointer",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          {d}
          {hasCitas && (
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#E8A838",
              display: "block",
            }} />
          )}
          {count > 1 && (
            <span style={{ fontSize: 8, color: "#b07820", lineHeight: 1 }}>{count}</span>
          )}
        </button>
      );
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells}
      </div>
    );
  };

  return (
    <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: 18 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 4 }}>AGENDA</div>
          <div style={{ fontSize: 11, color: "#777" }}>Clases de prueba y citas</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCitaForm(true)}>+ NUEVA CITA</button>
      </div>

      {/* Navegación de mes */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button
          onClick={goPrevMonth}
          disabled={isCurrentMonth}
          style={{
            background: "transparent",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            color: isCurrentMonth ? "#252525" : "#777",
            fontSize: 14,
            cursor: isCurrentMonth ? "default" : "pointer",
            padding: "2px 10px",
            lineHeight: 1.4,
          }}
        >
          ←
        </button>
        <span style={{ fontSize: 12, color: "#e0e0e0" }}>
          {MONTH_NAMES[calMonth]} {calYear}
        </span>
        <button
          onClick={goNextMonth}
          style={{
            background: "transparent",
            border: "1px solid #2a2a2a",
            borderRadius: 6,
            color: "#777",
            fontSize: 14,
            cursor: "pointer",
            padding: "2px 10px",
            lineHeight: 1.4,
          }}
        >
          →
        </button>
      </div>

      {/* Calendario */}
      {renderCalendar()}

      {/* Lista de citas del día seleccionado */}
      {selectedDay && (
        <div style={{ marginTop: 16, borderTop: "1px solid #2a2a2a", paddingTop: 14 }}>
          <div style={{ fontSize: 11, color: "#777", marginBottom: 10 }}>
            {(() => {
              const [y, m, d] = selectedDay.split("-");
              return `${parseInt(d)} de ${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
            })()}
          </div>
          {citasDelDia.length === 0 ? (
            <div style={{ fontSize: 12, color: "#555" }}>Sin citas este día.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {citasDelDia.map((cita) => (
                <button
                  key={cita.id}
                  onClick={() => setSelectedCita(cita)}
                  style={{
                    textAlign: "left",
                    background: "#0e0e0e",
                    border: "1px solid #2a2a2a",
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 2 }}>
                      {cita.leads?.nombre || "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "#777" }}>
                      {cita.hora?.slice(0, 5)} · {TIPO_LABEL[cita.tipo] || cita.tipo} · {cita.leads?.curso || ""}
                    </div>
                  </div>
                  <span style={{
                    ...getCitaStatusStyle(cita.status),
                    borderRadius: 999,
                    padding: "3px 10px",
                    fontSize: 10,
                    whiteSpace: "nowrap",
                  }}>
                    {cita.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de detalle de cita */}
      {selectedCita && (
        <div
          onClick={() => setSelectedCita(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#161616",
              border: "1px solid #2a2a2a",
              borderRadius: 12,
              padding: 24,
              maxWidth: 460,
              width: "100%",
            }}
          >
            {/* Header modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, color: "#e0e0e0", marginBottom: 4 }}>
                  {selectedCita.leads?.nombre || "Sin nombre"}
                </div>
                <div style={{ fontSize: 11, color: "#777" }}>
                  {TIPO_LABEL[selectedCita.tipo] || selectedCita.tipo}
                </div>
              </div>
              <button
                onClick={() => setSelectedCita(null)}
                style={{ background: "transparent", border: "none", color: "#555", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Info del lead */}
            <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
              {[
                { label: "CURSO", value: selectedCita.leads?.curso },
                { label: "EMAIL", value: selectedCita.leads?.email },
                { label: "WHATSAPP", value: selectedCita.leads?.whatsapp },
                { label: "FECHA", value: selectedCita.fecha },
                { label: "HORARIO", value: selectedCita.hora?.slice(0, 5) },
                { label: "DURACIÓN", value: selectedCita.duracion ? `${selectedCita.duracion} min` : null },
              ].filter((r) => r.value).map((row) => (
                <div key={row.label} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span style={{ fontSize: 10, color: "#555", letterSpacing: 1.2, minWidth: 72 }}>{row.label}</span>
                  <span style={{ fontSize: 12, color: "#e0e0e0" }}>{row.value}</span>
                </div>
              ))}
              {selectedCita.notas && (
                <div>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.2, marginBottom: 4 }}>NOTAS</div>
                  <div style={{ fontSize: 12, color: "#777", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                    {selectedCita.notas}
                  </div>
                </div>
              )}
            </div>

            {/* Status */}
            <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 14 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.2, marginBottom: 8 }}>ESTADO</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["pendiente", "confirmada", "completada", "cancelada"].map((status) => (
                  <button
                    key={status}
                    className="btn"
                    style={{
                      ...getCitaStatusStyle(status),
                      borderRadius: 999,
                      padding: "4px 12px",
                      fontSize: 10,
                      opacity: selectedCita.status === status ? 1 : 0.5,
                    }}
                    onClick={() => {
                      updateCitaStatus(selectedCita.id, status);
                      setSelectedCita({ ...selectedCita, status });
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
