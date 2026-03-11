"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

const HOURS = Array.from({ length: (18 - 9) * 2 + 1 }, (_, i) => 9 * 60 + i * 30) // 9:00 to 18:00 every 30 min
  .filter((m) => m <= 18 * 60);

function minutesToLabel(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ampm = h >= 12 ? "pm" : "am";
  const hh12 = ((h + 11) % 12) + 1;
  return `${hh12}:${mm === 0 ? "00" : mm} ${ampm}`;
}

export default function AgendarPage() {
  const params = useParams();
  const vendedorEmail = params?.vendedor ? decodeURIComponent(String(params.vendedor)) : "";
  const [vendedor, setVendedor] = useState(null);
  const [loadingVendedor, setLoadingVendedor] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notas, setNotas] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);

  const today = useMemo(() => new Date(), []);

  const daysInMonth = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return d.getDate();
  }, [today]);

  useEffect(() => {
    if (!vendedorEmail) {
      setLoadingVendedor(false);
      return;
    }
    const loadVendedor = async () => {
      setLoadingVendedor(true);
      setError("");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", vendedorEmail)
        .maybeSingle();
      if (error) {
        setError("No encontramos a este vendedor. Verifica el enlace.");
      } else if (!data) {
        setError("No encontramos a este vendedor. Verifica el enlace.");
      } else {
        setVendedor(data);
      }
      setLoadingVendedor(false);
    };
    loadVendedor();
  }, [vendedorEmail]);

  const onConfirm = async () => {
    if (!vendedor) return;
    if (!selectedDate || !selectedTime) {
      setError("Selecciona un día y una hora para tu cita.");
      return;
    }
    if (!nombre.trim() || !email.trim()) {
      setError("Nombre y email son obligatorios.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const fechaIso = selectedDate.toISOString().slice(0, 10);
      const [hStr, mStr] = selectedTime.split(":");
      const hora = `${hStr}:${mStr}:00`;

      // Crear lead
      const lead = {
        nombre: nombre.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        curso: "Clase de prueba INFOSALES",
        valor: 0,
        notas,
        stage: "interesado",
        fecha: fechaIso,
        user_id: vendedor.id,
        asignado_a: vendedor.id,
      };

      const { data: leadData, error: leadError } = await supabase
        .from("leads")
        .insert([lead])
        .select()
        .single();
      if (leadError || !leadData) {
        setError("No pudimos guardar tus datos. Intenta de nuevo.");
        setSubmitting(false);
        return;
      }

      // Crear cita
      const citaTitulo = `Clase de prueba - ${leadData.nombre}`;
      const { data: citaData, error: citaError } = await supabase
        .from("citas")
        .insert([
          {
            lead_id: leadData.id,
            vendedor_id: vendedor.id,
            titulo: citaTitulo,
            fecha: fechaIso,
            hora,
            duracion: 30,
            tipo: "clase_prueba",
            notas,
            status: "confirmada",
          },
        ])
        .select()
        .single();
      if (citaError || !citaData) {
        setError("No pudimos registrar la cita. Intenta de nuevo.");
        setSubmitting(false);
        return;
      }

      setConfirmed({
        lead: leadData,
        cita: citaData,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderCalendar = () => {
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(today.getFullYear(), today.getMonth(), d);
      const isPast =
        date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isSelected =
        selectedDate &&
        date.toDateString() === selectedDate.toDateString();
      days.push(
        <button
          key={d}
          disabled={isPast}
          onClick={() => {
            setSelectedDate(date);
            setSelectedTime(null);
          }}
          style={{
            borderRadius: 6,
            padding: "6px 0",
            border: "1px solid #2a2a2a",
            background: isSelected ? "#E8A838" : "transparent",
            color: isSelected ? "#0e0e0e" : isPast ? "#333" : "#e0e0e0",
            fontSize: 12,
            cursor: isPast ? "default" : "pointer",
          }}
        >
          {d}
        </button>
      );
    }
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
        }}
      >
        {days}
      </div>
    );
  };

  const renderTimes = () => {
    if (!selectedDate) {
      return (
        <div style={{ fontSize: 12, color: "#777" }}>
          Primero elige un día para ver los horarios disponibles.
        </div>
      );
    }
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          maxHeight: 180,
          overflowY: "auto",
        }}
      >
        {HOURS.map((m) => {
          const label = minutesToLabel(m);
          const hh = String(Math.floor(m / 60)).padStart(2, "0");
          const mm = String(m % 60).padStart(2, "0");
          const value = `${hh}:${mm}`;
          const isSelected = selectedTime === value;
          return (
            <button
              key={value}
              onClick={() => setSelectedTime(value)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #333",
                background: isSelected ? "#E8A838" : "#1a1a1a",
                color: isSelected ? "#0e0e0e" : "#e0e0e0",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  if (loadingVendedor) {
    return (
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          background: "#0e0e0e",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#777",
        }}
      >
        Cargando agenda...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          background: "#0e0e0e",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#E85D38",
          padding: 24,
          textAlign: "center",
        }}
      >
        {error}
      </div>
    );
  }

  if (confirmed) {
    const { lead, cita } = confirmed;
    return (
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          background: "#0e0e0e",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "#161616",
            borderRadius: 12,
            border: "1px solid #2a2a2a",
            padding: 28,
            maxWidth: 460,
            width: "100%",
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 28,
              letterSpacing: 3,
              color: "#E8A838",
              marginBottom: 6,
            }}
          >
            INFOSALES
          </div>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 24 }}>
            Tu clase de prueba está agendada.
          </div>
          <div style={{ fontSize: 13, color: "#e0e0e0", marginBottom: 6 }}>
            {lead.nombre}
          </div>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 16 }}>
            {lead.email} · {lead.whatsapp}
          </div>
          <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 4 }}>
            Fecha: {cita.fecha}
          </div>
          <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 4 }}>
            Hora: {cita.hora?.slice(0, 5)} (duración {cita.duracion} min)
          </div>
          <div style={{ fontSize: 12, color: "#777", marginTop: 12 }}>
            Te enviaremos recordatorios por WhatsApp y correo si el vendedor los
            tiene configurados.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'DM Mono', monospace",
        background: "#0e0e0e",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        color: "#e0e0e0",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
      `}</style>
      <div
        style={{
          maxWidth: 900,
          width: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.2fr)",
          gap: 32,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 32,
              letterSpacing: 3,
              color: "#E8A838",
              marginBottom: 6,
            }}
          >
            INFOSALES
          </div>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: 2, marginBottom: 24 }}>
            CRM v1.0 · Agendado de citas
          </div>
          <div style={{ fontSize: 14, color: "#e0e0e0", marginBottom: 4 }}>
            Agenda tu clase de prueba gratuita
          </div>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 16 }}>
            {vendedor?.nombre || vendedorEmail} · 30 minutos · Online
          </div>
          <div
            style={{
              background: "#161616",
              borderRadius: 10,
              border: "1px solid #2a2a2a",
              padding: 16,
            }}
          >
            <div style={{ fontSize: 11, color: "#777", marginBottom: 8 }}>
              Selecciona un día
            </div>
            {renderCalendar()}
          </div>
          <div
            style={{
              marginTop: 16,
              background: "#161616",
              borderRadius: 10,
              border: "1px solid #2a2a2a",
              padding: 16,
            }}
          >
            <div style={{ fontSize: 11, color: "#777", marginBottom: 8 }}>
              Horarios disponibles
            </div>
            {renderTimes()}
          </div>
        </div>
        <div>
          <div
            style={{
              background: "#161616",
              borderRadius: 10,
              border: "1px solid #2a2a2a",
              padding: 20,
            }}
          >
            <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 16 }}>
              Datos del prospecto
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>
                  NOMBRE
                </div>
                <input
                  className="input"
                  style={{ width: "100%" }}
                  placeholder="Tu nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>
                  EMAIL
                </div>
                <input
                  className="input"
                  style={{ width: "100%" }}
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>
                  WHATSAPP
                </div>
                <input
                  className="input"
                  style={{ width: "100%" }}
                  placeholder="+52 55 XXXX XXXX"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>
                  NOTAS
                </div>
                <textarea
                  className="input"
                  style={{ width: "100%", minHeight: 80 }}
                  placeholder="Cuéntanos brevemente qué te interesa mejorar o aprender."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 11,
                  color: "#E85D38",
                }}
              >
                {error}
              </div>
            )}
            <button
              className="btn btn-primary"
              style={{ marginTop: 16, width: "100%", padding: "10px 0", fontSize: 13 }}
              onClick={onConfirm}
              disabled={submitting}
            >
              {submitting ? "Agendando..." : "Confirmar clase de prueba →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

