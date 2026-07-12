// ─── CONFIGURACIÓN DE CONEXIÓN CON SUPABASE ───────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

const AUTH_USER = "Herbolaria";
const AUTH_PASS = "Saludable*"; 

let ADMINS = [];
let FUENTES = [];
let PRODUCTOS = [];
let PRESUPUESTOS = [];
let RESPONSABLES = [];
let EJECUTIVOS = [];

let LEADS = [];
let editingLeadId = null;
let editingAdminIndex = null;

const supabaseHeaders = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

const ESTADOS = ['Nuevo', 'Contactado', 'Calificado', 'Propuesta Enviada', 'En Negociación', 'Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

const STATUS_CLASS = {
  'Nuevo': 'b-nuevo', 'Contactado': 'b-contactado', 'Calificado': 'b-calificado',
  'Propuesta Enviada': 'b-propuesta', 'En Negociación': 'b-negociacion',
  'Cerrado Ganado': 'b-cerrado', 'Cerrado Perdido': 'b-perdido', 'Abandonado': 'b-abandonado'
};
const PRI_CLASS = { 'Alta': 'b-alta', 'Media': 'b-media', 'Baja': 'b-baja' };
const BAR_COLORS = ['#378ADD', '#1D9E75', '#D85A30', '#D4537E', '#7F77DD', '#639922', '#BA7517', '#E24B4A', '#888780', '#0F6E56'];

// ─── DESCARGA ASÍNCRONA DESDE SUPABASE ────────────────────────────────────────
async function cargarDatosDesdeSupabase() {
  try {
    // 1. Cargar Configuración Global
    const resConfig = await fetch(`${SUPABASE_URL}/rest/v1/configuracion?select=*`, { method: 'GET', headers: supabaseHeaders });
    if (resConfig.ok) {
      const dataConfig = await resConfig.json();
      if (dataConfig && dataConfig.length > 0) {
        const c = dataConfig[0];
        ADMINS = Array.isArray(c.admins) ? c.admins : [];
        FUENTES = Array.isArray(c.fuentes) ? c.fuentes : ["Facebook", "WhatsApp"];
        PRODUCTOS = Array.isArray(c.productos) ? c.productos : ["Suplemento Herbal"];
        PRESUPUESTOS = Array.isArray(c.presupuestos) ? c.presupuestos : ["$0 - $500"];
        RESPONSABLES = Array.isArray(c.responsables) ? c.responsables : ['Marketing Digital'];
        EJECUTIVOS = Array.isArray(c.ejecutives) ? c.ejecutives : ["Ejecutivo Base"];
      }
    }

    // 2. Cargar Todos los Leads
    const resLeads = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=*&order=id.asc`, { method: 'GET', headers: supabaseHeaders });
    if (resLeads.ok) {
      const dataLeads = await resLeads.json();
      LEADS = Array.isArray(dataLeads) ? dataLeads : []; 
    }
  } catch (error) {
    console.error("❌ Error cargando datos iniciales:", error);
  }
}

async function guardarConfiguracionEnSupabase() {
  try {
    const payload = {
      admins: ADMINS,
      fuentes: FUENTES,
      productos: PRODUCTOS,
      presupuestos: PRESUPUESTOS,
      responsables: RESPONSABLES,
      ejecutives: EJECUTIVOS
    };
    await fetch(`${SUPABASE_URL}/rest/v1/configuracion?id=eq.1`, {
      method: 'PATCH',
      headers: supabaseHeaders,
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("❌ Error guardando configuración:", e);
  }
}

async function guardarLeadEnSupabase(lead, isNew = false) {
  try {
    const payload = {
      nombre: lead.nombre,
      empresa: lead.empresa,
      telefono: lead.telefono,
      correo: lead.correo,
      puesto: lead.puesto,
      estado_geo: lead.estado_geo,
      pais: lead.pais || 'México',
      fuente: lead.fuente,
      producto: lead.producto,
      presupuesto: lead.presupuesto,
      responsable: lead.responsable,
      ejecutivo: lead.ejecutivo,
      monto: lead.monto,
      estado: lead.estado,
      prioridad: lead.prioridad,
      proximoseg: lead.proximoseg, 
      notes: lead.notes
    };

    if (isNew) {
      await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}`, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify(payload)
      });
    }
  } catch (error) {
    console.error("❌ Error guardando lead:", error);
  }
}

async function eliminarLeadDeSupabase(id) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, { method: 'DELETE', headers: supabaseHeaders });
  } catch (e) {
    console.error(e);
  }
}

// ─── AUTENTICACIÓN ────────────────────────────────────────────────────────────
function handleLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');

  const rootMatch = (u.toLowerCase() === AUTH_USER.toLowerCase() && p === AUTH_PASS);
  const adminMatch = ADMINS.some(a => a && a.user && a.user.toLowerCase() === u.toLowerCase() && a.pass === p);

  if (rootMatch || adminMatch) {
    if (err) err.style.display = 'none';
    sessionStorage.setItem('crm_logged_in', 'true');
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    
    renderDashboard();
    verificarRecordatoriosSeguimiento();
  } else {
    if (err) { err.style.display = 'block'; err.innerText = "Credenciales inválidas."; }
  }
}

function handleLogout() {
  sessionStorage.clear();
  location.reload();
}

function checkPasswordPrompt(actionName) {
  const p = prompt(`Para "${actionName}", ingresa la contraseña maestra:`);
  return p === AUTH_PASS;
}

// ─── NAVEGACIÓN Y COMPONENTES VIVIENTES ───────────────────────────────────────
function switchTab(tabId, el) {
  ['dashboard', 'leads', 'seguimiento', 'reportes', 'config'].forEach(t => {
    const s = document.getElementById(`tab-${t}`);
    if (s) s.style.display = (t === tabId) ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'leads') renderLeadsTable();
  if (tabId === 'seguimiento') renderSeguimiento();
  if (tabId === 'reportes') renderReportes();
  if (tabId === 'config') renderConfig();
}

function notify(text) {
  const n = document.getElementById('notification');
  if (n) {
    n.innerText = text; n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 3000);
  }
}

// ─── FORMULARIO LATERAL (NUEVO / EDICIÓN) ──────────────────────────────────────
function openNewLead() {
  editingLeadId = null;
  const titleEl = document.getElementById('panel-title');
  const btnDelEl = document.getElementById('btn-delete-lead');
  if (titleEl) titleEl.innerText = "Nuevo Lead";
  if (btnDelEl) btnDelEl.style.display = 'none';

  const inputs = ['n-nombre', 'n-empresa', 'n-telefono', 'n-correo', 'n-puesto', 'n-monto', 'n-seg', 'n-notas', 'n-estado_geo'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = (id === 'n-monto') ? '0' : '';
  });

  populateSelects();
  togglePanel(true);
}

function openEditLead(id) {
  editingLeadId = id;
  const l = LEADS.find(x => x.id === id);
  if (!l) return;

  document.getElementById('panel-title').innerText = "Editar Lead";
  document.getElementById('btn-delete-lead').style.display = 'inline-flex';

  populateSelects();

  document.getElementById('n-nombre').value = l.nombre || '';
  document.getElementById('n-empresa').value = l.empresa || '';
  document.getElementById('n-telefono').value = l.telefono || '';
  document.getElementById('n-correo').value = l.correo || '';
  document.getElementById('n-puesto').value = l.puesto || '';
  document.getElementById('n-monto').value = l.monto || 0;
  document.getElementById('n-seg').value = l.proximoseg ? l.proximoseg.substring(0,16) : '';
  document.getElementById('n-notas').value = l.notes || '';
  document.getElementById('n-estado_geo').value = l.estado_geo || '';

  document.getElementById('n-fuente').value = l.fuente || '';
  document.getElementById('n-producto').value = l.producto || '';
  document.getElementById('n-presupuesto').value = l.presupuesto || '';
  document.getElementById('n-responsable').value = l.responsable || '';
  document.getElementById('n-ejecutivo').value = l.ejecutivo || '';
  document.getElementById('n-situacion').value = l.estado || 'Nuevo';
  document.getElementById('n-prioridad').value = l.prioridad || 'Media';

  togglePanel(true);
}

function togglePanel(show) {
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('panel');
  if (overlay && panel) {
    if (show) { overlay.classList.add('active'); panel.classList.add('active'); }
    else { overlay.classList.remove('active'); panel.classList.remove('active'); }
  }
}

function closePanel(e) {
  if (e.target.id === 'overlay') togglePanel(false);
}

function populateSelects() {
  const f = document.getElementById('n-fuente');
  const p = document.getElementById('n-producto');
  const b = document.getElementById('n-presupuesto');
  const r = document.getElementById('n-responsable');
  const ej = document.getElementById('n-ejecutivo');
  const sit = document.getElementById('n-situacion');
  const pri = document.getElementById('n-prioridad');

  if (f) f.innerHTML = FUENTES.map(x => `<option value="${x}">${x}</option>`).join('');
  if (p) p.innerHTML = PRODUCTOS.map(x => `<option value="${x}">${x}</option>`).join('');
  if (b) b.innerHTML = PRESUPUESTOS.map(x => `<option value="${x}">${x}</option>`).join('');
  if (r) r.innerHTML = RESPONSABLES.map(x => `<option value="${x}">${x}</option>`).join('');
  if (ej) ej.innerHTML = EJECUTIVOS.map(x => `<option value="${x}">${x}</option>`).join('');
  if (sit) sit.innerHTML = ESTADOS.map(x => `<option value="${x}">${x}</option>`).join('');
  if (pri) pri.innerHTML = PRIORIDADES.map(x => `<option value="${x}">${x}</option>`).join('');
}

async function saveLead() {
  const nombre = document.getElementById('n-nombre').value.trim();
  if (!nombre) { alert('El nombre es obligatorio.'); return; }

  const l = {
    nombre,
    empresa: document.getElementById('n-empresa').value.trim(),
    telefono: document.getElementById('n-telefono').value.trim(),
    correo: document.getElementById('n-correo').value.trim(),
    puesto: document.getElementById('n-puesto').value.trim(),
    estado_geo: document.getElementById('n-estado_geo').value.trim(),
    fuente: document.getElementById('n-fuente').value,
    producto: document.getElementById('n-producto').value,
    presupuesto: document.getElementById('n-presupuesto').value,
    responsable: document.getElementById('n-responsable').value,
    ejecutivo: document.getElementById('n-ejecutivo').value,
    monto: parseFloat(document.getElementById('n-monto').value) || 0,
    estado: document.getElementById('n-situacion').value,
    prioridad: document.getElementById('n-prioridad').value,
    proximoseg: document.getElementById('n-seg').value,
    notes: document.getElementById('n-notas').value.trim()
  };

  if (editingLeadId !== null) {
    l.id = editingLeadId;
    await guardarLeadEnSupabase(l, false);
    notify('🔄 Lead actualizado exitosamente');
  } else {
    await guardarLeadEnSupabase(l, true);
    notify('✅ Lead creado exitosamente');
  }

  togglePanel(false);
  await cargarDatosDesdeSupabase(); 
  renderDashboard();
}

async function eliminarLeadActual() {
  if (editingLeadId === null) return;
  if (!confirm('¿Eliminar este lead permanentemente?')) return;
  if (!checkPasswordPrompt('Eliminar Registro')) return;

  await eliminarLeadDeSupabase(editingLeadId);
  togglePanel(false);
  await cargarDatosDesdeSupabase();
  renderDashboard();
  notify('🗑 Lead eliminado con éxito');
}

// ─── RENDERS KANBAN VISUALES DEL DASHBOARD ────────────────────────────────────
function renderDashboard() {
  const container = document.getElementById('tab-dashboard');
  if (!container) return;
  
  const totalLeads = LEADS.length;
  const totalMonto = LEADS.reduce((acc, l) => acc + (parseFloat(l.monto) || 0), 0);
  const ganados = LEADS.filter(l => l.estado === 'Cerrado Ganado');
  const montoGanado = ganados.reduce((acc, l) => acc + (parseFloat(l.monto) || 0), 0);

  let html = `
    <div class="metrics-grid">
      <div class="metric-card"><div class="metric-title">Total de Leads</div><div class="metric-value">${totalLeads}</div></div>
      <div class="metric-card"><div class="metric-title">Valor Pipeline</div><div class="metric-value">$${totalMonto.toLocaleString('es-MX')}</div></div>
      <div class="metric-card"><div class="metric-title">Leads Ganados</div><div class="metric-value">${ganados.length}</div></div>
      <div class="metric-card"><div class="metric-title">Cierre Total</div><div class="metric-value" style="color:var(--green)">$${montoGanado.toLocaleString('es-MX')}</div></div>
    </div>
    <div class="kanban-board">
  `;

  ESTADOS.forEach(est => {
    const leadsEnEstado = LEADS.filter(l => l.estado === est);
    const subtotal = leadsEnEstado.reduce((acc, l) => acc + (parseFloat(l.monto) || 0), 0);
    
    html += `
      <div class="kanban-column">
        <div class="kanban-header"><span>${est}</span><span class="count-badge">${leadsEnEstado.length}</span></div>
        <div class="kanban-subtotal">$${subtotal.toLocaleString('es-MX')}</div>
        <div class="kanban-cards-wrapper">
    `;

    leadsEnEstado.forEach(l => {
      html += `
        <div class="lead-card" onclick="openEditLead(${l.id})">
          <div style="font-weight:600; font-size:13px; color:var(--text);">${l.nombre}</div>
          ${l.empresa ? `<div style="font-size:11px; color:var(--text2); margin-top:4px;"><i class="ti ti-building"></i> ${l.empresa}</div>` : ''}
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
            <span class="badge ${PRI_CLASS[l.prioridad] || 'b-media'}">${l.prioridad || 'Media'}</span>
            <span style="font-weight:700; font-size:12px;">$${(parseFloat(l.monto) || 0).toLocaleString('es-MX')}</span>
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function renderLeadsTable() {
  const container = document.getElementById('tab-leads');
  if (!container) return;

  let html = `
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px; margin-bottom:16px; display:flex; gap:12px;">
      <input type="text" id="table-search" oninput="filterLeadsTable()" placeholder="Buscar por nombre..." style="flex:1; padding:8px; border:1px solid var(--border); background:var(--bg2); color:var(--text); border-radius:var(--radius);">
    </div>
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); overflow-x:auto;">
      <table class="leads-table" id="table-leads-el">
        <thead>
          <tr><th>Nombre</th><th>Empresa</th><th>Origen</th><th>Producto</th><th>Monto</th><th>Estado</th></tr>
        </thead><tbody>
  `;
  LEADS.forEach(l => {
    html += `<tr onclick="openEditLead(${l.id})">
      <td><b>${l.nombre}</b></td><td>${l.empresa || '—'}</td><td>${l.fuente || '—'}</td><td>${l.producto || '—'}</td>
      <td>$${(parseFloat(l.monto) || 0).toLocaleString('es-MX')}</td>
      <td><span class="badge ${STATUS_CLASS[l.estado]}">${l.estado}</span></td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function filterLeadsTable() {
  const query = document.getElementById('table-search').value.toLowerCase();
  const rows = document.querySelectorAll('#table-leads-el tbody tr');
  LEADS.forEach((l, idx) => {
    if(rows[idx]) rows[idx].style.display = l.nombre.toLowerCase().includes(query) ? '' : 'none';
  });
}

function renderSeguimiento() {
  const container = document.getElementById('tab-seguimiento');
  if (!container) return;
  const hoy = new Date();
  const paraHoy = LEADS.filter(l => l.proximoseg && new Date(l.proximoseg).toDateString() === hoy.toDateString());

  container.innerHTML = `
    <div style="background:var(--bg); padding:20px; border-radius:var(--radius-lg); border:1px solid var(--border)">
      <h3>📅 Seguimientos Agendados para Hoy (${paraHoy.length})</h3>
      <div style="margin-top:12px;">
        ${paraHoy.map(l => `<div style="padding:10px; background:var(--bg2); border-radius:var(--radius); margin-bottom:8px; cursor:pointer;" onclick="openEditLead(${l.id})"><b>${l.nombre}</b> - ${l.proximoseg.substring(11,16)} hrs</div>`).join('')}
      </div>
    </div>
  `;
}

function renderReportes() {
  const container = document.getElementById('tab-reportes');
  if (container) container.innerHTML = `<div style="padding:20px; color:var(--text2)">Gráficos y analíticas vinculadas en tiempo real.</div>`;
}

function renderConfig() {
  const container = document.getElementById('tab-config');
  if (!container) return;
  container.innerHTML = `
    <div class="config-container">
      <div class="config-box">
        <h3>🌿 Configuración del CRM</h3>
        <p style="color:var(--text2); margin-bottom:10px;">Fuentes cargadas: ${FUENTES.join(', ')}</p>
        <p style="color:var(--text2);">Productos activos: ${PRODUCTOS.join(', ')}</p>
      </div>
    </div>
  `;
}

function verificarRecordatoriosSeguimiento() {
  const hoyStr = new Date().toDateString();
  const hoyLeads = LEADS.filter(l => l.proximoseg && new Date(l.proximoseg).toDateString() === hoyStr);
  if (hoyLeads.length > 0) {
    alert(`📢 ¡Recordatorio! Tienes (${hoyLeads.length}) seguimientos pendientes hoy.`);
  }
}

// ─── INICIALIZADOR GLOBAL ─────────────────────────────────────────────────────
window.onload = async function() {
  await cargarDatosDesdeSupabase();
  if (sessionStorage.getItem('crm_logged_in') === 'true') {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    renderDashboard();
  } else {
    document.getElementById('login-container').style.display = 'flex';
  }
};
