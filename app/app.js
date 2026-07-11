// ─── CONFIGURACIÓN DE CONEXIÓN CON SUPABASE ───────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

// CREDENCIALES EXCLUSIVAS ACTUALIZADAS
const AUTH_USER = "Herbolaria";
const AUTH_PASS = "Saludable*"; 

// Arreglos globales dinámicos que se sincronizan con Supabase
let ADMINS = [];
let FUENTES = [];
let PRODUCTOS = [];
let PRESUPUESTOS = [];
let RESPONSABLES = ['Marketing Digital', 'Ventas Online', 'Gerencia de Ventas', 'Gerencia General'];
let EJECUTIVOS = [
  "Pilar Gonzalez - marketing digital",
  "Ana Maria Alonso - Ventas Online",
  "Yessica Carrillo - Gerencia de Ventas (Ventas Mayoreo)",
  "Emmanuel Zúñiga - Gerencia General"
];

let editingAdminIndex = null;

// ARREGLO DE LEADS (Manejado globalmente)
let LEADS = [];
let editingLeadId = null;

// Headers para la API de Supabase REST
const supabaseHeaders = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

// ARRAYS ESTÁTICOS ORIGINALES COMPLETAMENTE INTACTOS
const ESTADOS = ['Nuevo', 'Contactado', 'Calificado', 'Propuesta Enviada', 'En Negociación', 'Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

const STATUS_CLASS = {
  'Nuevo': 'b-nuevo', 'Contactado': 'b-contactado', 'Calificado': 'b-calificado',
  'Propuesta Enviada': 'b-propuesta', 'En Negociación': 'b-negociacion',
  'Cerrado Ganado': 'b-cerrado', 'Cerrado Perdido': 'b-perdido', 'Abandonado': 'b-abandonado'
};
const PRI_CLASS = { 'Alta': 'b-alta', 'Media': 'b-media', 'Baja': 'b-baja' };
const BAR_COLORS = ['#378ADD', '#1D9E75', '#D85A30', '#D4537E', '#7F77DD', '#639922', '#BA7517', '#E24B4A', '#888780', '#0F6E56'];
const ESTADO_COLORS = {
  'Nuevo': '#378ADD', 'Contactado': '#7F77DD', 'Calificado': '#639922',
  'Propuesta Enviada': '#BA7517', 'En Negociación': '#D4537E',
  'Cerrado Ganado': '#1D9E75', 'Cerrado Perdido': '#E24B4A', 'Abandonado': '#888780'
};

// ─── CRM LÓGICA Y DESCARGA ASÍNCRONA DESDE SUPABASE ────────────────────────────
async function cargarDatosDesdeSupabase() {
  try {
    // 1. Cargar Configuración Global de forma segura
    const resConfig = await fetch(`${SUPABASE_URL}/rest/v1/configuracion?select=*`, { headers: supabaseHeaders });
    if (resConfig.ok) {
      const dataConfig = await resConfig.json();
      if (dataConfig && dataConfig.length > 0) {
        const c = dataConfig[0];
        ADMINS = Array.isArray(c.admins) ? c.admins : [];
        FUENTES = Array.isArray(c.fuentes) ? c.fuentes : [];
        PRODUCTOS = Array.isArray(c.productos) ? c.productos : [];
        PRESUPUESTOS = Array.isArray(c.presupuestos) ? c.presupuestos : [];
        RESPONSABLES = Array.isArray(c.responsables) && c.responsables.length > 0 ? c.responsables : RESPONSABLES;
        EJECUTIVOS = Array.isArray(c.ejecutives) && c.ejecutives.length > 0 ? c.ejecutives : EJECUTIVOS;
      }
    }

    // 2. Cargar Todos los Leads de forma segura
    const resLeads = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=*&order=id.asc`, { headers: supabaseHeaders });
    if (resLeads.ok) {
      const dataLeads = await resLeads.json();
      LEADS = Array.isArray(dataLeads) ? dataLeads : []; 
    } else {
      LEADS = [];
    }
  } catch (error) {
    console.error("❌ Error cargando datos iniciales de Supabase:", error);
    LEADS = [];
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
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("❌ Error guardando configuración:", e);
  }
}

async function guardarLeadEnSupabase(lead, isNew = false) {
  try {
    if (isNew) {
      const { id, ...leadData } = lead; 
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify(leadData)
      });
      if (res.ok) {
        const datosInsertados = await res.json();
        if (datosInsertados && datosInsertados.length > 0) {
          lead.id = datosInsertados[0].id; 
        }
      }
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${lead.id}`, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify(lead)
      });
    }
  } catch (error) {
    console.error("❌ Error sincronizando lead en Supabase:", error);
  }
}

async function eliminarLeadDeSupabase(id) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
      method: 'DELETE',
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
  } catch (error) {
    console.error("❌ Error eliminando lead de Supabase:", error);
  }
}

// ─── AUTENTICACIÓN Y SEGURIDAD ────────────────────────────────────────────────
function handleLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');

  const rootMatch = (u.toLowerCase() === AUTH_USER.toLowerCase() && p === AUTH_PASS);
  const adminMatch = Array.isArray(ADMINS) && ADMINS.some(a => a && a.user && a.user.toLowerCase() === u.toLowerCase() && a.pass === p);

  if (rootMatch || adminMatch) {
    err.style.display = 'none';
    sessionStorage.setItem('crm_logged_in', 'true');
    sessionStorage.setItem('crm_user', u);
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    renderDashboard();
    verificarRecordatoriosSeguimiento();
  } else {
    err.style.display = 'block';
    err.innerText = "Usuario o contraseña incorrectos.";
  }
}

function handleLogout() {
  sessionStorage.removeItem('crm_logged_in');
  sessionStorage.removeItem('crm_user');
  location.reload();
}

// ─── SEGURIDAD CONTRASEÑA MAESTRA ─────────────────────────────────────────────
function checkPasswordPrompt(actionName) {
  const p = prompt(`Para "${actionName}", por favor introduce la contraseña del Administrador Maestro:`);
  if (p === null) return false;
  if (p === AUTH_PASS) return true;
  alert('❌ Contraseña maestra incorrecta. Acción cancelada.');
  return false;
}

// ─── NAVEGACIÓN (TABS) ────────────────────────────────────────────────────────
function switchTab(tabId, el) {
  ['dashboard', 'leads', 'seguimiento', 'reportes', 'config'].forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    if (section) section.style.display = (t === tabId) ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'leads') renderLeadsTable();
  if (tabId === 'seguimiento') renderSeguimiento();
  if (tabId === 'reportes') renderReportes();
  if (tabId === 'config') renderConfig();
}

// ─── INTERFAZ NOTIFICACIONES Y MODALES ORIGINALES ─────────────────────────────
function notify(text) {
  const n = document.getElementById('notification');
  if (n) {
    n.innerText = text;
    n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 3500);
  }
}

function openNewLead() {
  editingLeadId = null;
  document.getElementById('panel-title').innerText = "Nuevo Lead";
  document.getElementById('btn-delete-lead').style.display = 'none';

  // Limpiar campos formulario original
  document.getElementById('n-nombre').value = '';
  document.getElementById('n-empresa').value = '';
  document.getElementById('n-telefono').value = '';
  document.getElementById('n-correo').value = '';
  document.getElementById('n-puesto').value = '';
  document.getElementById('n-monto').value = '';
  document.getElementById('n-seg').value = '';
  document.getElementById('n-notas').value = '';
  document.getElementById('n-estado').value = '';

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
  document.getElementById('n-monto').value = l.monto || '';
  document.getElementById('n-seg').value = (l.proximoSeg && typeof l.proximoSeg === 'string') ? l.proximoSeg.substring(0,16) : '';
  document.getElementById('n-notas').value = l.notas || '';
  document.getElementById('n-estado').value = l.estado_geo || '';

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
  if (show) {
    overlay.classList.add('active');
    panel.classList.add('active');
  } else {
    overlay.classList.remove('active');
    panel.classList.remove('active');
  }
}

function closePanel(e) {
  if (!e || e.target.id === 'overlay') togglePanel(false);
}

function populateSelects() {
  const f = document.getElementById('n-fuente');
  const p = document.getElementById('n-producto');
  const b = document.getElementById('n-presupuesto');
  const r = document.getElementById('n-responsable');
  const ej = document.getElementById('n-ejecutivo');
  const sit = document.getElementById('n-situacion');
  const pri = document.getElementById('n-prioridad');

  if(f) f.innerHTML = FUENTES.map(x => `<option value="${x}">${x}</option>`).join('');
  if(p) p.innerHTML = PRODUCTOS.map(x => `<option value="${x}">${x}</option>`).join('');
  if(b) b.innerHTML = PRESUPUESTOS.map(x => `<option value="${x}">${x}</option>`).join('');
  if(r) r.innerHTML = RESPONSABLES.map(x => `<option value="${x}">${x}</option>`).join('');
  if(ej) ej.innerHTML = EJECUTIVOS.map(x => `<option value="${x}">${x}</option>`).join('');
  if(sit) sit.innerHTML = ESTADOS.map(x => `<option value="${x}">${x}</option>`).join('');
  if(pri) pri.innerHTML = PRIORIDADES.map(x => `<option value="${x}">${x}</option>`).join('');
}

// ─── ACCIONES SOBRE LEADS CON SOPORTE ASÍNCRONO ─────────────────────────────────
async function saveLead() {
  const nombre = document.getElementById('n-nombre').value.trim();
  if (!nombre) { alert('El nombre es obligatorio.'); return; }

  const l = {
    nombre,
    empresa: document.getElementById('n-empresa').value.trim(),
    telefono: document.getElementById('n-telefono').value.trim(),
    correo: document.getElementById('n-correo').value.trim(),
    puesto: document.getElementById('n-puesto').value.trim(),
    estado_geo: document.getElementById('n-estado').value || '',
    pais: 'México',
    fuente: document.getElementById('n-fuente').value,
    producto: document.getElementById('n-producto').value,
    presupuesto: document.getElementById('n-presupuesto').value,
    responsable: document.getElementById('n-responsable').value,
    ejecutivo: document.getElementById('n-ejecutivo').value,
    monto: parseFloat(document.getElementById('n-monto').value) || 0,
    estado: document.getElementById('n-situacion').value,
    prioridad: document.getElementById('n-prioridad').value,
    proximoSeg: document.getElementById('n-seg').value,
    notas: document.getElementById('n-notas').value.trim(),
    fechaActualizacion: new Date().toISOString()
  };

  if (editingLeadId !== null) {
    l.id = editingLeadId;
    const idx = LEADS.findIndex(x => x.id === editingLeadId);
    if (idx !== -1) {
      l.fechaCreacion = LEADS[idx].fechaCreacion;
      LEADS[idx] = l;
    }
    await guardarLeadEnSupabase(l, false);
    editingLeadId = null;
    notify('🔄 Lead actualizado correctamente');
  } else {
    l.fechaCreacion = new Date().toISOString();
    LEADS.push(l);
    await guardarLeadEnSupabase(l, true);
    notify('✅ Lead creado exitosamente');
  }

  togglePanel(false);
  
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    if (activeTab.innerText.includes('Dashboard')) renderDashboard();
    if (activeTab.innerText.includes('Todos')) renderLeadsTable();
    if (activeTab.innerText.includes('Seguimiento')) renderSeguimiento();
  }
}

async function eliminarLeadActual() {
  if (editingLeadId === null) return;
  if (!confirm('¿Estás seguro de eliminar permanentemente este lead?')) return;
  if (!checkPasswordPrompt('Eliminar este Registro de Lead')) return;

  const idAEliminar = editingLeadId;
  LEADS = LEADS.filter(l => l.id !== idAEliminar);
  await eliminarLeadDeSupabase(idAEliminar);

  togglePanel(false);
  editingLeadId = null;

  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    if (activeTab.innerText.includes('Dashboard')) renderDashboard();
    if (activeTab.innerText.includes('Todos')) renderLeadsTable();
    if (activeTab.innerText.includes('Seguimiento')) renderSeguimiento();
  }
  notify('🗑 Lead eliminado de la base de datos');
}

// ─── RENDERS DE PANELES Y COMPONENTES VISUALES ORIGINALES ─────────────────────
// 🔥 BLINDADO COMPLETO CONTRA PROPIEDADES INDEFINIDAS O TABLAS CONFIG EN BLANCO
function renderDashboard() {
  const container = document.getElementById('tab-dashboard');
  if (!container) return;
  
  const totalLeads = Array.isArray(LEADS) ? LEADS.length : 0;
  const totalMonto = Array.isArray(LEADS) ? LEADS.reduce((acc, l) => acc + (l.monto || 0), 0) : 0;
  const ganados = Array.isArray(LEADS) ? LEADS.filter(l => l.estado === 'Cerrado Ganado') : [];
  const montoGanado = ganados.reduce((acc, l) => acc + (l.monto || 0), 0);

  let html = `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-title">Total de Leads</div>
        <div class="metric-value">${totalLeads}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Valor del Pipeline</div>
        <div class="metric-value">$${totalMonto.toLocaleString('es-MX')}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Leads Ganados</div>
        <div class="metric-value">${ganados.length}</div>
      </div>
      <div class="metric-card">
        <div class="metric-title">Cierre Total</div>
        <div class="metric-value" style="color:var(--green)">$${montoGanado.toLocaleString('es-MX')}</div>
      </div>
    </div>

    <div class="kanban-board">
  `;

  ESTADOS.forEach(est => {
    const leadsEnEstado = Array.isArray(LEADS) ? LEADS.filter(l => l.estado === est) : [];
    const subtotal = leadsEnEstado.reduce((acc, l) => acc + (l.monto || 0), 0);
    
    html += `
      <div class="kanban-column">
        <div class="kanban-header">
          <span>${est}</span>
          <span class="count-badge">${leadsEnEstado.length}</span>
        </div>
        <div class="kanban-subtotal">$${subtotal.toLocaleString('es-MX')}</div>
        <div class="kanban-cards-wrapper">
    `;

    leadsEnEstado.forEach(l => {
      html += `
        <div class="lead-card" onclick="openEditLead(${l.id})">
          <div style="font-weight:600; font-size:13px; margin-bottom:4px;">${l.nombre}</div>
          ${l.empresa ? `<div style="font-size:11px; color:var(--text2); margin-bottom:6px;"><i class="ti ti-building" style="font-size:12px;"></i> ${l.empresa}</div>` : ''}
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <span class="badge ${PRI_CLASS[l.prioridad] || 'b-media'}">${l.prioridad || 'Media'}</span>
            <span style="font-weight:700; font-size:12px;">$${(l.monto || 0).toLocaleString('es-MX')}</span>
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
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px; margin-bottom:16px; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
      <div style="flex:1; min-width:200px;">
        <input type="text" id="table-search" oninput="filterLeadsTable()" placeholder="Buscar por nombre, empresa, notas..." style="width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg2); color:var(--text);">
      </div>
      <select id="filter-estado" onchange="filterLeadsTable()" style="padding:8px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg2); color:var(--text);">
        <option value="">📋 Todos los estados</option>
        ${ESTADOS.map(x => `<option value="${x}">${x}</option>`).join('')}
      </select>
      <select id="filter-prioridad" onchange="filterLeadsTable()" style="padding:8px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg2); color:var(--text);">
        <option value="">🔥 Todas las prioridades</option>
        ${PRIORIDADES.map(x => `<option value="${x}">${x}</option>`).join('')}
      </select>
    </div>
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); overflow-x:auto;">
      <table class="leads-table" id="table-leads-el">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Empresa</th>
            <th>Origen / Fuente</th>
            <th>Producto Interés</th>
            <th>Responsable</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Prioridad</th>
          </tr>
        </thead>
        <tbody>
  `;

  LEADS.forEach(l => {
    html += `
      <tr onclick="openEditLead(${l.id})">
        <td style="font-weight:600;">${l.nombre}</td>
        <td>${l.empresa || '—'}</td>
        <td>${l.fuente || '—'}</td>
        <td>${l.producto || '—'}</td>
        <td>${l.responsable || '—'}</td>
        <td style="font-weight:700;">$${(l.monto || 0).toLocaleString('es-MX')}</td>
        <td><span class="badge ${STATUS_CLASS[l.estado] || 'b-nuevo'}">${l.estado || 'Nuevo'}</span></td>
        <td><span class="badge ${PRI_CLASS[l.prioridad] || 'b-media'}">${l.prioridad || 'Media'}</span></td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function filterLeadsTable() {
  const query = document.getElementById('table-search').value.toLowerCase();
  const est = document.getElementById('filter-estado').value;
  const pri = document.getElementById('filter-prioridad').value;
  const rows = document.querySelectorAll('#table-leads-el tbody tr');

  LEADS.forEach((l, idx) => {
    const row = rows[idx];
    if (!row) return;

    let match = true;
    if (est && l.estado !== est) match = false;
    if (pri && l.prioridad !== pri) match = false;
    if (query) {
      const txt = (l.nombre + ' ' + (l.empresa || '') + ' ' + (l.notas || '')).toLowerCase();
      if (!txt.includes(query)) match = false;
    }
    row.style.display = match ? '' : 'none';
  });
}

function renderSeguimiento() {
  const container = document.getElementById('tab-seguimiento');
  if (!container) return;
  const hoy = new Date();

  const vencidos = LEADS.filter(l => l.proximoSeg && new Date(l.proximoSeg) < hoy && l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado');
  const paraHoy = LEADS.filter(l => {
    if (!l.proximoSeg) return false;
    const f = new Date(l.proximoSeg);
    return f.toDateString() === hoy.toDateString() && l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado';
  });
  const futuros = LEADS.filter(l => l.proximoSeg && new Date(l.proximoSeg) > hoy && l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado');

  let html = `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:16px;">`;

  html += `<div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px;">
    <h3 style="color:#E24B4A; margin-bottom:12px; display:flex; align-items:center; gap:6px; font-size:14px;"><i class="ti ti-alert-triangle"></i> Vencidos (${vencidos.length})</h3>`;
  vencidos.forEach(l => {
    html += `<div style="padding:10px; border:1px solid var(--border); border-radius:var(--radius); margin-bottom:8px; background:var(--bg2); cursor:pointer;" onclick="openEditLead(${l.id})">
      <div style="font-weight:600;">${l.nombre}</div>
      <div style="font-size:11px; color:#E24B4A; margin-top:4px;"><i class="ti ti-calendar"></i> ${new Date(l.proximoSeg).toLocaleString('es-MX')}</div>
    </div>`;
  });
  html += `</div>`;

  html += `<div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px;">
    <h3 style="color:var(--green); margin-bottom:12px; display:flex; align-items:center; gap:6px; font-size:14px;"><i class="ti ti-clock"></i> Programados Hoy (${paraHoy.length})</h3>`;
  paraHoy.forEach(l => {
    html += `<div style="padding:10px; border:1px solid var(--border); border-radius:var(--radius); margin-bottom:8px; background:var(--bg2); cursor:pointer;" onclick="openEditLead(${l.id})">
      <div style="font-weight:600;">${l.nombre}</div>
      <div style="font-size:11px; color:var(--green); margin-top:4px;"><i class="ti ti-calendar"></i> ${new Date(l.proximoSeg).toLocaleString('es-MX')}</div>
    </div>`;
  });
  html += `</div>`;

  html += `<div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:16px;">
    <h3 style="color:#378ADD; margin-bottom:12px; display:flex; align-items:center; gap:6px; font-size:14px;"><i class="ti ti-calendar-time"></i> Siguientes Días (${futuros.length})</h3>`;
  futuros.forEach(l => {
    html += `<div style="padding:10px; border:1px solid var(--border); border-radius:var(--radius); margin-bottom:8px; background:var(--bg2); cursor:pointer;" onclick="openEditLead(${l.id})">
      <div style="font-weight:600;">${l.nombre}</div>
      <div style="font-size:11px; color:var(--text2); margin-top:4px;"><i class="ti ti-calendar"></i> ${new Date(l.proximoSeg).toLocaleString('es-MX')}</div>
    </div>`;
  });
  html += `</div></div>`;

  container.innerHTML = html;
}

function renderReportes() {
  const container = document.getElementById('tab-reportes');
  if (!container) return;

  const porFuente = {};
  LEADS.forEach(l => {
    const f = l.fuente || 'No especificado';
    porFuente[f] = (porFuente[f] || 0) + 1;
  });

  const porEjecutivo = {};
  LEADS.forEach(l => {
    const e = l.ejecutivo || 'Sin ejecutivo';
    porEjecutivo[e] = (porEjecutivo[e] || 0) + (l.monto || 0);
  });

  let html = `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap:16px;">`;

  html += `<div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px;">
    <h3 style="margin-bottom:16px; font-size:14px;"><i class="ti ti-chart-pie"></i> Leads por Origen / Fuente</h3>`;
  const valuesFuente = Object.values(porFuente);
  const maxFuente = valuesFuente.length > 0 ? Math.max(...valuesFuente, 1) : 1;
  Object.keys(porFuente).forEach((k, idx) => {
    const val = porFuente[k];
    const pct = (val / maxFuente) * 100;
    const color = BAR_COLORS[idx % BAR_COLORS.length];
    html += `<div style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
        <span>${k}</span><span style="font-weight:600;">${val} leads</span>
      </div>
      <div style="height:8px; background:var(--bg3); border-radius:4px; overflow:hidden;">
        <div style="width:${pct}%; height:100%; background:${color}; border-radius:4px;"></div>
      </div>
    </div>`;
  });
  html += `</div>`;

  html += `<div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px;">
    <h3 style="margin-bottom:16px; font-size:14px;"><i class="ti ti-chart-bar"></i> Valor en Cartera por Ejecutivo</h3>`;
  const valuesEj = Object.values(porEjecutivo);
  const maxEj = valuesEj.length > 0 ? Math.max(...valuesEj, 1) : 1;
  Object.keys(porEjecutivo).forEach((k, idx) => {
    const val = porEjecutivo[k];
    const pct = (val / maxEj) * 100;
    html += `<div style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
        <span>${k}</span><span style="font-weight:600;">$${val.toLocaleString('es-MX')}</span>
      </div>
      <div style="height:8px; background:var(--bg3); border-radius:4px; overflow:hidden;">
        <div style="width:${pct}%; height:100%; background:var(--green); border-radius:4px;"></div>
      </div>
    </div>`;
  });
  html += `</div></div>`;

  container.innerHTML = html;
}

function renderConfig() {
  const container = document.getElementById('tab-config');
  if (!container) return;

  let html = `<div class="config-container">`;

  const makeBox = (title, tipo, lista) => {
    const listaValida = Array.isArray(lista) ? lista : [];
    let bHtml = `<div class="config-box">
      <h3>${title}</h3>
      <div class="config-tags-wrapper">`;
    listaValida.forEach(x => {
      bHtml += `<span class="config-tag">${x} <button onclick="removeConfigItem('${tipo}','${x}')">×</button></span>`;
    });
    bHtml += `</div>
      <div style="display:flex; gap:8px;">
        <input type="text" id="in-${tipo}" placeholder="Agregar nuevo..." style="flex:1; padding:6px 10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg2); color:var(--text); font-size:12px;">
        <button class="btn btn-primary" style="padding:6px 12px; font-size:12px;" onclick="addConfigItem('${tipo}')">Añadir</button>
      </div>
    </div>`;
    return bHtml;
  };

  html += makeBox('📁 Orígenes / Fuentes de Tráfico', 'fuente', FUENTES);
  html += makeBox('🌿 Productos y Tratamientos', 'producto', PRODUCTOS);
  html += makeBox('💰 Segmentos de Presupuesto', 'presupuesto', PRESUPUESTOS);
  html += makeBox('🏢 Áreas Responsables', 'responsable', RESPONSABLES);
  html += makeBox('👥 Equipo de Ejecutivos de Venta', 'ejecutivo', EJECUTIVOS);

  const adminsValidos = Array.isArray(ADMINS) ? ADMINS : [];
  html += `<div class="config-box">
    <h3><i class="ti ti-users-lock"></i> Cuentas de Administradores Secundarios</h3>
    <div style="overflow-x:auto; margin-bottom:12px;">
      <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
        <thead>
          <tr style="border-bottom:1px solid var(--border); color:var(--text2)">
            <th style="padding:6px;">Usuario</th>
            <th style="padding:6px;">Contraseña</th>
            <th style="padding:6px; text-align:right;">Acciones</th>
          </tr>
        </thead>
        <tbody>`;
  adminsValidos.forEach((adm, i) => {
    if (adm && adm.user) {
      html += `<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:6px; font-weight:600;">${adm.user}</td>
        <td style="padding:6px; color:var(--text3)">••••••••</td>
        <td style="padding:6px; text-align:right;">
          <button onclick="editAdminUserClick(${i})" style="background:none; border:none; color:#378ADD; cursor:pointer; margin-right:8px;"><i class="ti ti-edit"></i></button>
          <button onclick="removeAdminUser(${i})" style="background:none; border:none; color:#E24B4A; cursor:pointer;"><i class="ti ti-trash"></i></button>
        </td>
      </tr>`;
    }
  });
  html += `</tbody></table></div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <input type="text" id="cfg-admin-user" placeholder="Usuario" style="flex:1; min-width:100px; padding:6px 10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg2); color:var(--text); font-size:12px;">
      <input type="password" id="cfg-admin-pass" placeholder="Contraseña" style="flex:1; min-width:100px; padding:6px 10px; border:1px solid var(--border); border-radius:var(--radius); background:var(--bg2); color:var(--text); font-size:12px;">
      <button class="btn btn-primary" id="btn-save-admin" style="padding:6px 12px; font-size:12px;" onclick="saveAdminUser()">Guardar</button>
    </div>
  </div></div>`;

  container.innerHTML = html;
}

// ─── ACCIONES DE CONFIGURACIÓN CON PERSISTENCIA EN NUBE ───────────────────────
async function addConfigItem(tipo) {
  const input = document.getElementById(`in-${tipo}`);
  const valor = input?.value.trim();
  if (!valor) return;

  if (tipo === 'fuente' && !FUENTES.includes(valor)) FUENTES.push(valor);
  if (tipo === 'producto' && !PRODUCTOS.includes(valor)) PRODUCTOS.push(valor);
  if (tipo === 'presupuesto' && !PRESUPUESTOS.includes(valor)) PRESUPUESTOS.push(valor);
  if (tipo === 'responsable' && !RESPONSABLES.includes(valor)) RESPONSABLES.push(valor);
  if (tipo === 'ejecutivo' && !EJECUTIVOS.includes(valor)) EJECUTIVOS.push(valor);

  if (input) input.value = '';
  await guardarConfiguracionEnSupabase();
  renderConfig();
  notify('✨ Opción agregada correctamente');
}

async function removeConfigItem(tipo, valor) {
  if (!checkPasswordPrompt(`Eliminar la opción "${valor}" de la lista`)) return;

  if (tipo === 'fuente') FUENTES = FUENTES.filter(x => x !== valor);
  if (tipo === 'producto') PRODUCTOS = PRODUCTOS.filter(x => x !== valor);
  if (tipo === 'presupuesto') PRESUPUESTOS = PRESUPUESTOS.filter(x => x !== valor);
  if (tipo === 'responsable') RESPONSABLES = RESPONSABLES.filter(x => x !== valor);
  if (tipo === 'ejecutivo') EJECUTIVOS = EJECUTIVOS.filter(x => x !== valor);

  await guardarConfiguracionEnSupabase();
  renderConfig();
  notify('🗑 Opción eliminada');
}

function editAdminUserClick(index) {
  editingAdminIndex = index;
  if(ADMINS[index]) {
    document.getElementById('cfg-admin-user').value = ADMINS[index].user || '';
    document.getElementById('cfg-admin-pass').value = ADMINS[index].pass || '';
    document.getElementById('btn-save-admin').innerText = "Modificar";
  }
}

async function saveAdminUser() {
  const userEl = document.getElementById('cfg-admin-user');
  const passEl = document.getElementById('cfg-admin-pass');
  const userVal = userEl?.value.trim();
  const passVal = passEl?.value;

  if (!userVal || !passVal) return;
  if (userVal.toLowerCase() === AUTH_USER.toLowerCase()) {
    alert('❌ No se puede duplicar el usuario raíz.');
    return;
  }

  if (editingAdminIndex !== null) {
    if (!checkPasswordPrompt(`Modificar la configuración del usuario "${ADMINS[editingAdminIndex].user}"`)) return;
    ADMINS[editingAdminIndex] = { user: userVal, pass: passVal };
    editingAdminIndex = null;
    document.getElementById('btn-save-admin').innerText = "Guardar";
    notify('🔄 Cuenta de administrador modificada');
  } else {
    if (ADMINS.some(a => a && a.user && a.user.toLowerCase() === userVal.toLowerCase())) {
      alert('❌ El usuario ya existe.');
      return;
    }
    ADMINS.push({ user: userVal, pass: passVal });
    notify('➕ Administrador añadió');
  }

  if (userEl) userEl.value = ''; 
  if (passEl) passEl.value = '';
  await guardarConfiguracionEnSupabase();
  renderConfig();
}

async function removeAdminUser(index) {
  const adminTarget = ADMINS[index];
  if (!adminTarget) return;

  if (!checkPasswordPrompt(`Eliminar permanentemente los accesos de "${adminTarget.user}"`)) return;

  ADMINS.splice(index, 1);
  if (editingAdminIndex === index) editingAdminIndex = null;

  await guardarConfiguracionEnSupabase();
  renderConfig();
  notify('🗑 Administrador eliminado del sistema');
}

// ─── ALERTAS DE SEGUIMIENTO DIARIO ORIGINALES ─────────────────────────────────
function verificarRecordatoriosSeguimiento() {
  const hoyStr = new Date().toDateString();
  const hoyLeads = Array.isArray(LEADS) ? LEADS.filter(l => {
    if (!l.proximoSeg) return false;
    return new Date(l.proximoSeg).toDateString() === hoyStr && l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado';
  }) : [];

  if (hoyLeads.length > 0) {
    setTimeout(() => {
      alert(`📢 ¡Recordatorio de Ventas!\nTienes (${hoyLeads.length}) seguimientos agendados para el día de hoy. Por favor, revisa la pestaña de Seguimiento.`);
    }, 1000);
  }
}

// ─── INICIALIZADOR ASÍNCRONO DEL WINDOW.ONLOAD ────────────────────────────────
window.onload = async function() {
  await cargarDatosDesdeSupabase();

  if (sessionStorage.getItem('crm_logged_in') === 'true') {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    renderDashboard();
    verificarRecordatoriosSeguimiento();
  } else {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('main-layout').style.display = 'none';
  }
};
