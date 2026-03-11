"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
const supabase = createClient();

const STAGES = [
  { id: "nuevo", label: "🎯 Nuevo Lead", color: "#4A90D9", bg: "#1a2a3a" },
  { id: "contactado", label: "📞 Contactado", color: "#E8A838", bg: "#2a1f0a" },
  { id: "interesado", label: "🔥 Interesado", color: "#E85D38", bg: "#2a1210" },
  { id: "propuesta", label: "📋 Propuesta", color: "#9B59B6", bg: "#1e1228" },
  { id: "cerrado", label: "✅ Cerrado", color: "#27AE60", bg: "#0d2018" },
  { id: "perdido", label: "❌ Perdido", color: "#555", bg: "#1a1a1a" },
];

const CURSOS = ["Curso de Marketing Digital", "Mentoría 1:1", "Bootcamp Ventas", "Programa Premium"];
const formatPeso = (v) => `$${Number(v).toLocaleString("es-MX")}`;

const WA_TEMPLATES = {
  contactado: (nombre, curso) => `Hola ${nombre} 👋 Vi que te interesó *${curso}*. ¿Tienes 5 minutos para platicarte de qué trata?`,
  interesado: (nombre, curso) => `Hola ${nombre}! Quería darte más detalles sobre *${curso}* y resolver tus dudas. ¿Cuándo te viene bien una llamada rápida?`,
  propuesta: (nombre, curso) => `${nombre}, te envío el resumen de nuestra propuesta para *${curso}*. Cualquier duda estoy aquí 🙌`,
  cerrado: (nombre, curso) => `¡Felicidades ${nombre}! 🎉 Ya eres parte de *${curso}*. En breve recibes tus accesos. ¡Éxito!`,
};

export default function CRM() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("kanban");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showCitaForm, setShowCitaForm] = useState(false);
  const [filterVendedor, setFilterVendedor] = useState("Todos");
  const [search, setSearch] = useState("");
  const [dragId, setDragId] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [newLead, setNewLead] = useState({ nombre: "", email: "", whatsapp: "", curso: CURSOS[0], valor: "", notas: "", asignado_a: "" });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content:
        "Hola, soy tu asistente de ventas INFOSALES. Cuéntame sobre tus leads y te doy recomendaciones concretas para cerrarlos.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [citas, setCitas] = useState([]);
  const [nuevaCita, setNuevaCita] = useState({
    lead_id: "",
    fecha: "",
    hora: "",
    tipo: "clase_prueba",
    duracion: 30,
    notas: "",
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isAdmin = currentProfile?.rol === "admin";

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    // Cargar o crear perfil
    let { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile) {
      const { data: newProfile } = await supabase.from("profiles")
        .insert([{ id: user.id, email: user.email, nombre: user.email.split("@")[0], rol: "vendedor" }])
        .select().single();
      profile = newProfile;
    }
    setCurrentProfile(profile);

    // Cargar lista de vendedores (todos los perfiles)
    const { data: allProfiles } = await supabase.from("profiles").select("*");
    setVendedores(allProfiles || []);

    // Preseleccionar el usuario actual como asignado
    setNewLead(prev => ({ ...prev, asignado_a: user.id }));

    fetchLeads(user.id, profile?.rol === "admin");
    fetchCitas(user.id, profile?.rol === "admin");
  };

  const fetchLeads = async (userId, admin) => {
    setLoading(true);
    let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
    // Vendedores solo ven sus leads asignados
    if (!admin) {
      query = query.eq("asignado_a", userId);
    }
    const { data, error } = await query;
    if (error) showToast("Error cargando leads", "error");
    else setLeads(data || []);
    setLoading(false);
  };

  const fetchCitas = async (userId, admin) => {
    let query = supabase
      .from("citas")
      .select("*, leads(nombre, email)")
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    if (!admin) {
      query = query.eq("vendedor_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      showToast("Error cargando citas", "error");
    } else {
      setCitas(data || []);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchV = filterVendedor === "Todos" || l.asignado_a === filterVendedor;
    const matchS = l.nombre.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    return matchV && matchS;
  });

  const byStage = (stageId) => filteredLeads.filter(l => l.stage === stageId);

  const moveStage = async (leadId, newStage) => {
    const { error } = await supabase.from("leads").update({ stage: newStage }).eq("id", leadId);
    if (error) return showToast("Error actualizando", "error");
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
    showToast("Lead movido a " + STAGES.find(s => s.id === newStage)?.label);
  };

  const handleDrop = (stageId) => {
    if (dragId) { moveStage(dragId, stageId); setDragId(null); }
  };

  const addLead = async () => {
    if (!newLead.nombre || !newLead.email) return showToast("Nombre y email son requeridos", "error");
    const lead = {
      ...newLead,
      stage: "nuevo",
      fecha: new Date().toISOString().slice(0, 10),
      valor: Number(newLead.valor) || 0,
      user_id: currentUser.id,
      asignado_a: newLead.asignado_a || currentUser.id,
    };
    const { data, error } = await supabase.from("leads").insert([lead]).select();
    if (error) return showToast("Error agregando lead", "error");
    setLeads(prev => [data[0], ...prev]);
    setShowForm(false);
    setNewLead({ nombre: "", email: "", whatsapp: "", curso: CURSOS[0], valor: "", notas: "", asignado_a: currentUser.id });
    showToast("Lead agregado ✓");
  };

  const deleteLead = async (id) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return showToast("Error eliminando", "error");
    setLeads(prev => prev.filter(l => l.id !== id));
    setSelectedLead(null);
    showToast("Lead eliminado");
  };

  const updateNotas = async (id, notas) => {
    await supabase.from("leads").update({ notas }).eq("id", id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, notas } : l));
  };

  const reasignarLead = async (leadId, nuevoAsignadoId) => {
    const { error } = await supabase.from("leads").update({ asignado_a: nuevoAsignadoId }).eq("id", leadId);
    if (error) return showToast("Error reasignando", "error");
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, asignado_a: nuevoAsignadoId } : l));
    setSelectedLead(prev => ({ ...prev, asignado_a: nuevoAsignadoId }));
    const nombre = vendedores.find(v => v.id === nuevoAsignadoId)?.nombre || "vendedor";
    showToast(`Lead reasignado a ${nombre} ✓`);
  };

  const getNombreVendedor = (id) => vendedores.find(v => v.id === id)?.nombre || vendedores.find(v => v.id === id)?.email?.split("@")[0] || "—";

  const totalRevenue = leads.filter(l => l.stage === "cerrado").reduce((a, b) => a + b.valor, 0);
  const pipelineValue = leads.filter(l => !["cerrado", "perdido"].includes(l.stage)).reduce((a, b) => a + b.valor, 0);
  const convRate = leads.length ? Math.round((leads.filter(l => l.stage === "cerrado").length / leads.length) * 100) : 0;

  const openWA = (lead) => {
    const template = WA_TEMPLATES[lead.stage] || WA_TEMPLATES["contactado"];
    const msg = encodeURIComponent(template(lead.nombre.split(" ")[0], lead.curso));
    const num = lead.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  };

  const guardarCita = async () => {
    if (!nuevaCita.lead_id || !nuevaCita.fecha || !nuevaCita.hora) {
      return showToast("Lead, fecha y hora son obligatorios", "error");
    }

    const lead = leads.find((l) => l.id === nuevaCita.lead_id);
    if (!lead || !currentUser) {
      return showToast("Lead o usuario no válido", "error");
    }

    const titulo = `${nuevaCita.tipo === "clase_prueba" ? "Clase prueba" : nuevaCita.tipo === "llamada" ? "Llamada" : "Reunión"} con ${lead.nombre}`;

    const { data, error } = await supabase
      .from("citas")
      .insert([
        {
          lead_id: nuevaCita.lead_id,
          vendedor_id: currentUser.id,
          titulo,
          fecha: nuevaCita.fecha,
          hora: nuevaCita.hora,
          duracion: nuevaCita.duracion,
          tipo: nuevaCita.tipo,
          notas: nuevaCita.notas,
          status: "pendiente",
        },
      ])
      .select();

    if (error) {
      showToast("Error guardando la cita", "error");
      return;
    }

    setCitas((prev) => [...prev, data[0]]);
    setShowCitaForm(false);
    setNuevaCita({
      lead_id: "",
      fecha: "",
      hora: "",
      tipo: "clase_prueba",
      duracion: 30,
      notas: "",
    });
    showToast("Cita agendada ✓");
  };

  const leadsForAI = leads.map((l) => {
    const vendedor = vendedores.find((v) => v.id === l.asignado_a);
    const asignadoNombre =
      vendedor?.nombre || vendedor?.email?.split("@")[0] || null;

    return {
      id: l.id,
      nombre: l.nombre,
      email: l.email,
      curso: l.curso,
      stage: l.stage,
      valor: l.valor,
      asignado_id: l.asignado_a || null,
      asignado_nombre: asignadoNombre,
      fecha: l.fecha,
    };
  });

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const newMessages = [
      ...chatMessages,
      { role: "user", content: chatInput.trim() },
    ];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, leads: leadsForAI }),
      });

      if (!res.ok) {
        showToast("Error hablando con el asistente de ventas", "error");
        setChatLoading(false);
        return;
      }

      const data = await res.json();
      const reply = data?.reply?.content || "No pude generar una respuesta.";

      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      showToast("Error de red con el asistente", "error");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: "#0e0e0e", minHeight: "100vh", color: "#e0e0e0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #E8A838; border-radius: 2px; }
        .card { background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; transition: all 0.2s; cursor: grab; }
        .card:hover { border-color: #E8A838; transform: translateY(-2px); box-shadow: 0 4px 20px rgba(232,168,56,0.15); }
        .card:active { cursor: grabbing; }
        .btn { border: none; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 500; transition: all 0.15s; }
        .btn-primary { background: #E8A838; color: #0e0e0e; padding: 8px 16px; }
        .btn-primary:hover { background: #f5b840; }
        .btn-ghost { background: transparent; color: #888; padding: 6px 12px; border: 1px solid #333; }
        .btn-ghost:hover { border-color: #E8A838; color: #E8A838; }
        .btn-wa { background: #25D366; color: white; padding: 5px 10px; }
        .btn-wa:hover { background: #20b858; }
        .input { background: #1e1e1e; border: 1px solid #333; border-radius: 6px; color: #e0e0e0; font-family: inherit; font-size: 13px; padding: 8px 12px; width: 100%; outline: none; transition: border 0.2s; }
        .input:focus { border-color: #E8A838; }
        .select { appearance: none; background: #1e1e1e; border: 1px solid #333; border-radius: 6px; color: #e0e0e0; font-family: inherit; font-size: 13px; padding: 8px 12px; width: 100%; outline: none; cursor: pointer; }
        .select:focus { border-color: #E8A838; }
        .tag { display: inline-block; border-radius: 4px; font-size: 10px; font-weight: 500; padding: 2px 7px; letter-spacing: 0.5px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #161616; border: 1px solid #333; border-radius: 12px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; }
        .toast { position: fixed; bottom: 24px; right: 24px; z-index: 999; padding: 12px 20px; border-radius: 8px; font-size: 13px; animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        .col-drop { min-height: 80px; border-radius: 6px; transition: background 0.2s; }
        .col-drop.drag-over { background: rgba(232,168,56,0.05); border: 1px dashed #E8A838; }
        .stat-card { background: #161616; border: 1px solid #2a2a2a; border-radius: 10px; padding: 20px; }
        .nav-btn { background: transparent; border: none; cursor: pointer; font-family: inherit; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; padding: 8px 16px; border-radius: 6px; transition: all 0.15s; }
        .nav-btn.active { background: #E8A838; color: #0e0e0e; font-weight: 500; }
        .nav-btn:not(.active) { color: #666; }
        .nav-btn:not(.active):hover { color: #E8A838; }
        textarea { resize: vertical; min-height: 60px; }
        .loading { display: flex; align-items: center; justify-content: center; height: 200px; font-size: 14px; color: #555; }
        .admin-badge { background: #E8A83822; color: #E8A838; border: 1px solid #E8A83844; border-radius: 4px; font-size: 10px; padding: 2px 8px; letter-spacing: 1px; }
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #1e1e1e", padding: "0 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 3, color: "#E8A838" }}>INFOSALES</span>
            <span style={{ fontSize: 11, color: "#555", letterSpacing: 2 }}>CRM v1.0</span>
            {isAdmin && <span className="admin-badge">ADMIN</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={`nav-btn ${view === "kanban" ? "active" : ""}`} onClick={() => setView("kanban")}>KANBAN</button>
            <button className={`nav-btn ${view === "lista" ? "active" : ""}`} onClick={() => setView("lista")}>LISTA</button>
            <button className={`nav-btn ${view === "agenda" ? "active" : ""}`} onClick={() => setView("agenda")}>AGENDA</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#555" }}>{currentProfile?.email || currentUser?.email}</span>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ NUEVO LEAD</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "PIPELINE TOTAL", value: formatPeso(pipelineValue), sub: `${filteredLeads.filter(l => !["cerrado","perdido"].includes(l.stage)).length} leads activos`, color: "#4A90D9" },
            { label: "INGRESOS CERRADOS", value: formatPeso(totalRevenue), sub: `${leads.filter(l => l.stage === "cerrado").length} ventas`, color: "#27AE60" },
            { label: "TASA DE CIERRE", value: `${convRate}%`, sub: `de ${leads.length} leads totales`, color: "#E8A838" },
            { label: "LEADS HOY", value: leads.filter(l => l.fecha === new Date().toISOString().slice(0,10)).length, sub: "nuevos ingresos", color: "#E85D38" },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
          <input className="input" style={{ maxWidth: 260 }} placeholder="🔍  Buscar lead..." value={search} onChange={e => setSearch(e.target.value)} />
          {isAdmin && (
            <select className="select" style={{ maxWidth: 200 }} value={filterVendedor} onChange={e => setFilterVendedor(e.target.value)}>
              <option value="Todos">Todos los vendedores</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre || v.email}</option>)}
            </select>
          )}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#555" }}>{filteredLeads.length} leads mostrados</div>
        </div>

        {loading && <div className="loading">Cargando leads...</div>}

        {/* KANBAN */}
        {!loading && view === "kanban" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, overflowX: "auto" }}>
            {STAGES.map(stage => (
              <div key={stage.id}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                onDragLeave={e => e.currentTarget.classList.remove("drag-over")}
                onDrop={e => { e.currentTarget.classList.remove("drag-over"); handleDrop(stage.id); }}
                className="col-drop" style={{ minWidth: 190 }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "10px 12px", background: stage.bg, borderRadius: 8, border: `1px solid ${stage.color}22` }}>
                  <div>
                    <div style={{ fontSize: 11, color: stage.color, fontWeight: 500, letterSpacing: 0.5 }}>{stage.label}</div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{formatPeso(byStage(stage.id).reduce((a,b) => a+b.valor, 0))}</div>
                  </div>
                  <div style={{ background: stage.color + "22", color: stage.color, borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>
                    {byStage(stage.id).length}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {byStage(stage.id).map(lead => (
                    <div key={lead.id} className="card" draggable
                      onDragStart={() => setDragId(lead.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setSelectedLead(lead)}
                      style={{ padding: 12 }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#e8e8e8", marginBottom: 4 }}>{lead.nombre}</div>
                      <div style={{ fontSize: 10, color: "#555", marginBottom: 8 }}>{lead.curso}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: stage.color, fontWeight: 600 }}>{formatPeso(lead.valor)}</span>
                        <span style={{ fontSize: 10, color: "#555" }}>{getNombreVendedor(lead.asignado_a)}</span>
                      </div>
                      {lead.notas && (
                        <div style={{ marginTop: 8, fontSize: 10, color: "#666", borderTop: "1px solid #222", paddingTop: 6, lineHeight: 1.4 }}>
                          {lead.notas.slice(0, 50)}{lead.notas.length > 50 ? "…" : ""}
                        </div>
                      )}
                    </div>
                  ))}
                  {byStage(stage.id).length === 0 && (
                    <div style={{ textAlign: "center", padding: "20px 0", fontSize: 11, color: "#333" }}>vacío</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LISTA */}
        {!loading && view === "lista" && (
          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {["NOMBRE", "CURSO", "ETAPA", "VALOR", "ASIGNADO A", "FECHA", "ACCIONES"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, color: "#555", letterSpacing: 1.5, fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const stage = STAGES.find(s => s.id === lead.stage);
                  return (
                    <tr key={lead.id} style={{ borderBottom: "1px solid #1e1e1e", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#1e1e1e"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
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
                      <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-wa" onClick={() => openWA(lead)}>WA</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* AGENDA */}
        {!loading && view === "agenda" && (
          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 4 }}>AGENDA</div>
                <div style={{ fontSize: 11, color: "#777" }}>Vista de citas próximas</div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowCitaForm(true)}>+ NUEVA CITA</button>
            </div>
            {citas.length === 0 ? (
              <div style={{ padding: 20, borderRadius: 8, border: "1px dashed #333", textAlign: "center", color: "#555", fontSize: 12 }}>
                No hay citas agendadas.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {citas.map((cita) => (
                  <div
                    key={cita.id}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #2a2a2a",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <div style={{ color: "#e0e0e0", marginBottom: 2 }}>{cita.titulo}</div>
                      <div style={{ color: "#777" }}>
                        {cita.fecha} · {cita.hora?.slice(0, 5)} · {cita.duracion} min ·{" "}
                        {cita.tipo === "clase_prueba"
                          ? "Clase prueba"
                          : cita.tipo === "llamada"
                          ? "Llamada"
                          : "Reunión"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", color: "#555" }}>
                      <div>{cita.leads?.nombre}</div>
                      <div style={{ fontSize: 11 }}>{cita.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DETALLE LEAD */}
      {selectedLead && (() => {
        const lead = leads.find(l => l.id === selectedLead.id) || selectedLead;
        const stage = STAGES.find(s => s.id === lead.stage);
        return (
          <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
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
                    <div style={{ fontSize: 18, color: stage?.color, fontFamily: "'Bebas Neue'", letterSpacing: 1 }}>{formatPeso(lead.valor)}</div>
                  </div>
                </div>

                {/* REASIGNAR — solo admin */}
                {isAdmin && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 8 }}>ASIGNADO A</div>
                    <select className="select" value={lead.asignado_a || ""} onChange={e => reasignarLead(lead.id, e.target.value)}>
                      <option value="">Sin asignar</option>
                      {vendedores.map(v => (
                        <option key={v.id} value={v.id}>{v.nombre || v.email} {v.rol === "admin" ? "(admin)" : ""}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!isAdmin && (
                  <div style={{ marginBottom: 20, background: "#1a1a1a", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 4 }}>ASIGNADO A</div>
                    <div style={{ fontSize: 13, color: "#e0e0e0" }}>{getNombreVendedor(lead.asignado_a)}</div>
                  </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 8 }}>MOVER A ETAPA</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {STAGES.map(s => (
                      <button key={s.id} className="btn"
                        style={{ background: lead.stage === s.id ? s.color : s.color + "18", color: lead.stage === s.id ? "#0e0e0e" : s.color, border: `1px solid ${s.color}44`, padding: "5px 10px", fontSize: 11 }}
                        onClick={() => { moveStage(lead.id, s.id); setSelectedLead({ ...lead, stage: s.id }); }}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 8 }}>NOTAS</div>
                  <textarea className="input" style={{ fontSize: 12, lineHeight: 1.5 }}
                    value={lead.notas || ""}
                    onChange={e => { updateNotas(lead.id, e.target.value); setSelectedLead({...lead, notas: e.target.value}); }}
                    placeholder="Agrega notas sobre este lead..."
                  />
                </div>

                {WA_TEMPLATES[lead.stage] && (
                  <div style={{ marginBottom: 20, background: "#0d1e12", border: "1px solid #25D36644", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 10, color: "#25D366", letterSpacing: 1, marginBottom: 8 }}>MENSAJE SUGERIDO PARA WHATSAPP</div>
                    <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6, marginBottom: 10 }}>
                      {WA_TEMPLATES[lead.stage](lead.nombre.split(" ")[0], lead.curso)}
                    </div>
                    <button className="btn btn-wa" style={{ fontSize: 12, padding: "8px 16px" }} onClick={() => openWA(lead)}>
                      📱 Abrir en WhatsApp
                    </button>
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
                  <button className="btn" style={{ background: "#2a0d0d", color: "#E85D38", border: "1px solid #E85D3844", padding: "8px 16px", fontSize: 12 }}
                    onClick={() => deleteLead(lead.id)}>Eliminar lead</button>
                )}
                <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setSelectedLead(null)}>Guardar y cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL NUEVO LEAD */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: 24 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: "#E8A838", letterSpacing: 2, marginBottom: 20 }}>NUEVO LEAD</div>
              <div style={{ display: "grid", gap: 14 }}>
                {[
                  { label: "NOMBRE *", key: "nombre", placeholder: "Nombre completo" },
                  { label: "EMAIL *", key: "email", placeholder: "correo@email.com" },
                  { label: "WHATSAPP", key: "whatsapp", placeholder: "+52 55 XXXX XXXX" },
                  { label: "VALOR ESTIMADO ($)", key: "valor", placeholder: "0" },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>{f.label}</div>
                    <input className="input" placeholder={f.placeholder} value={newLead[f.key]}
                      onChange={e => setNewLead(prev => ({ ...prev, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>CURSO INTERESADO</div>
                  <select className="select" value={newLead.curso} onChange={e => setNewLead(p => ({ ...p, curso: e.target.value }))}>
                    {CURSOS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>ASIGNAR A VENDEDOR</div>
                  <select className="select" value={newLead.asignado_a} onChange={e => setNewLead(p => ({ ...p, asignado_a: e.target.value }))}>
                    {vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.nombre || v.email} {v.rol === "admin" ? "(admin)" : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>NOTAS INICIALES</div>
                  <textarea className="input" placeholder="¿De dónde llegó? ¿Qué necesita?" value={newLead.notas}
                    onChange={e => setNewLead(p => ({ ...p, notas: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={addLead}>AGREGAR LEAD →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA CITA */}
      {showCitaForm && (
        <div className="modal-overlay" onClick={() => setShowCitaForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ padding: 24 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: "#E8A838", letterSpacing: 2, marginBottom: 20 }}>NUEVA CITA</div>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>LEAD</div>
                  <select
                    className="select"
                    value={nuevaCita.lead_id}
                    onChange={e => setNuevaCita(prev => ({ ...prev, lead_id: e.target.value }))}
                  >
                    <option value="">Selecciona un lead</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.nombre} — {l.email}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>FECHA</div>
                    <input
                      type="date"
                      className="input"
                      value={nuevaCita.fecha}
                      onChange={e => setNuevaCita(prev => ({ ...prev, fecha: e.target.value }))}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>HORA</div>
                    <input
                      type="time"
                      className="input"
                      value={nuevaCita.hora}
                      onChange={e => setNuevaCita(prev => ({ ...prev, hora: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>TIPO</div>
                  <select
                    className="select"
                    value={nuevaCita.tipo}
                    onChange={e => setNuevaCita(prev => ({ ...prev, tipo: e.target.value }))}
                  >
                    <option value="clase_prueba">Clase prueba</option>
                    <option value="llamada">Llamada</option>
                    <option value="reunion">Reunión</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>DURACIÓN</div>
                  <select
                    className="select"
                    value={nuevaCita.duracion}
                    onChange={e => setNuevaCita(prev => ({ ...prev, duracion: Number(e.target.value) }))}
                  >
                    <option value={30}>30 minutos</option>
                    <option value={60}>60 minutos</option>
                    <option value={90}>90 minutos</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 1.5, marginBottom: 6 }}>NOTAS</div>
                  <textarea
                    className="input"
                    placeholder="Detalles de la cita..."
                    value={nuevaCita.notas}
                    onChange={e => setNuevaCita(prev => ({ ...prev, notas: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowCitaForm(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={guardarCita}>GUARDAR CITA →</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHATBOT IA */}
      <button
        onClick={() => setChatOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 900,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          background: "#E8A838",
          color: "#0e0e0e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          cursor: "pointer",
          fontSize: 22,
        }}
        aria-label="Abrir asistente de ventas"
      >
        💬
      </button>

      {chatOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: 360,
            maxHeight: 520,
            background: "#0e0e0e",
            borderRadius: 12,
            border: "1px solid #2a2a2a",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
            zIndex: 901,
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid #2a2a2a",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#111",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "#E8A838",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                Asistente INFOSALES
              </div>
              <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
                IA enfocada en ventas y tus leads
              </div>
            </div>
            <button
              className="btn-ghost"
              style={{ border: "none", background: "transparent", color: "#777" }}
              onClick={() => setChatOpen(false)}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              padding: "10px 12px",
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background:
                    m.role === "user" ? "#E8A838" : "rgba(255,255,255,0.03)",
                  color: m.role === "user" ? "#0e0e0e" : "#e0e0e0",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 12,
                  lineHeight: 1.5,
                  border:
                    m.role === "user"
                      ? "none"
                      : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {m.content}
              </div>
            ))}
            {chatLoading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  fontSize: 11,
                  color: "#777",
                }}
              >
                Pensando recomendaciones...
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: "1px solid #2a2a2a",
              padding: "8px 10px",
              background: "#111",
              display: "flex",
              gap: 6,
            }}
          >
            <input
              className="input"
              style={{ fontSize: 12, padding: "8px 10px" }}
              placeholder="Pregúntame cómo avanzar tus leads..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
            />
            <button
              className="btn btn-primary"
              style={{ padding: "0 14px", fontSize: 12, whiteSpace: "nowrap" }}
              onClick={sendChat}
              disabled={chatLoading}
            >
              {chatLoading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" style={{ background: toast.type === "error" ? "#2a0d0d" : "#0d2018", border: `1px solid ${toast.type === "error" ? "#E85D38" : "#27AE60"}44`, color: toast.type === "error" ? "#E85D38" : "#27AE60" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
