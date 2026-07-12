// ─── CONFIGURACIÓN DE CONEXIÓN CON SUPABASE ───────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

let AUTH_USER = "Herbolaria";
let AUTH_PASS = "Saludable*"; // Clave por defecto inicial

let ADMINS = [];
let FUENTES = [];
let PRODUCTOS = [];
let PRESUPUESTOS = [];
let ESTADOS_PIPELINE = [];

// ELEMENTOS FIJOS SOLICITADOS
const RESPONSABLES = [
  'Pilar Gonzalez - marketing digital',
  'Ana Maria Alonso - Ventas Online',
  'Yessica Carrillo - Gerencia de Ventas (Ventas Mayoreo)',
  'Emmanuel Zúñiga - Gerencia General'
];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

let LEADS = [];
let currentLeadId = null;
const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

// ─── PETICIONES API HTTP ──────────────────────────────────────────────────────
async function supabaseRequest(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": (method === 'POST' || method === 'PATCH') ? "return=representation" : ""
  };
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  try {
    const res = await fetch(url, config);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    return res.status === 204 ? true : await res.json();
  } catch (err) {
    console.error(`Error Supabase [${endpoint}]:`, err);
    return null;
  }
}

// ─── FUNCIÓN AUXILIAR DE VALIDACIÓN DE CONTRASEÑA ACTUAL ──────────────────────
function validarPasswordMomento() {
  const p = prompt("🔐 Para autorizar esta acción, ingresa tu CONTRASEÑA ACTUAL:");
  if (p === null) return false; // Usuario canceló
  if (p === AUTH_PASS) {
    return true;
  } else {
    alert("❌ Contraseña incorrecta. Acción cancelada.");
    return false;
  }
}

// ─── CARGA Y FLUJO GLOBAL DE CATÁLOGOS NUBE ───────────────────────────────────
async function cargarConfiguracionesBase() {
  document.getElementById('cfg-main-user').value = AUTH_USER;

  // Sincronizar contraseña maestra desde Supabase (si existe la cuenta principal guardada)
  const aData = await supabaseRequest('config_admins?select=*');
  ADMINS = aData || [];
  
  const principalDb = ADMINS.find(a => a.user.toLowerCase() === AUTH_USER.toLowerCase());
  if (principalDb && principalDb.pass) {
    AUTH_PASS = principalDb.pass;
  }
  document.getElementById('cfg-main-pass').value = AUTH_PASS;

  const fData = await supabaseRequest('config_fuentes?select=*');
  FUENTES = fData ? fData.map(x => x.nombre) : [];
  
  const pData = await supabaseRequest('config_productos?select=*');
  PRODUCTOS = pData ? pData.map(x => x.nombre) : [];

  const prData = await supabaseRequest('config_presupuestos?select=*');
  PRESUPUESTOS = prData ? prData.map(x => x.nombre) : [];

  const estData = await supabaseRequest('config_responsables?select=*');
  ESTADOS_PIPELINE = estData ? estData.map(x => x.nombre) : [];

  actualizarSelectsFiltrosTodosLeads();
  renderConfiguracionPanel();
}

async function fetchLeads() {
  const data = await supabaseRequest('crm_leads?select=*&order=id.desc');
  LEADS = data || [];
  renderDashboard();
  renderTodosLosLeads(LEADS);
  renderSeguimientoColumnas();
}

async function inicializarSistema() {
  await cargarConfiguracionesBase();
  await fetchLeads();
  verificarRecordatoriosHoy(LEADS);
}

// ─── LOGIN & ACCESO DE USUARIOS ───────────────────────────────────────────────
async function handleLogin() {
  const uVal = document.getElementById('login-user').value.trim();
  const pVal = document.getElementById('login-pass').value.trim();
  const errorDiv = document.getElementById('login-error');

  // Primero jalar los admins actualizados para validar contra datos en tiempo real
  const aData = await supabaseRequest('config_admins?select=*');
  if (aData) ADMINS = aData;
  
  const principalDb = ADMINS.find(a => a.user.toLowerCase() === AUTH_USER.toLowerCase());
  if (principalDb && principalDb.pass) {
    AUTH_PASS = principalDb.pass;
  }

  let esValido = false;
  if (uVal.toLowerCase() === AUTH_USER.toLowerCase() && pVal === AUTH_PASS) {
    esValido = true;
  } else {
    const secundario = ADMINS.find(a => a.user.toLowerCase() === uVal.toLowerCase() && a.pass === pVal);
    if (secundario) esValido = true;
  }

  if (esValido) {
    errorDiv.style.display = 'none';
    sessionStorage.setItem('crm_logged_in', 'true');
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    inicializarSistema();
  } else {
    errorDiv.textContent = "⚠️ Usuario o contraseña inválidos.";
    errorDiv.style.display = 'block';
  }
}

function handleLogout() {
  sessionStorage.removeItem('crm_logged_in');
  window.location.reload();
}

// ─── PESTAÑA: TODOS LOS LEADS (FILTROS Y TABLA COMPLETA) ──────────────────────
function actualizarSelectsFiltrosTodosLeads() {
  inyectarOpcionesFiltro('f-fuente', FUENTES, 'Todas las fuentes');
  inyectarOpcionesFiltro('f-estado', ESTADOS_PIPELINE, 'Todos los estados');
  inyectarOpcionesFiltro('f-responsable', RESPONSABLES, 'Todos los responsables');
  inyectarOpcionesFiltro('f-prioridad', PRIORIDADES, 'Todas las prioridades');
}

function inyectarOpcionesFiltro(elementId, array, defaultText) {
  const select = document.getElementById(elementId);
  if (!select) return;
  let html = `<option value="">${defaultText}</option>`;
  array.forEach(v => { html += `<option value="${v}">${v}</option>`; });
  select.innerHTML = html;
}

function renderTodosLosLeads(leadsArr) {
  const container = document.getElementById('tab-leads');
  if (!container) return;

  const tableBody = document.querySelector('.crm-table tbody');
  if (!tableBody) return;

  if (leadsArr.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="11" class="no-data-row">No se encontraron prospectos</td></tr>`;
    return;
  }

  let html = "";
  leadsArr.forEach(l => {
    const fStr = l.created_at ? new Date(l.created_at).toLocaleDateString('es-MX') : '—';
    const proxStr = l.proximoseg ? new Date(l.proximoseg).toLocaleString('es-MX', {dateStyle:'short', timeStyle:'short'}) : '—';
    const totalMonto = l.monto_potencial ? `$${Number(l.monto_potencial).toLocaleString('es-MX')}` : '—';
    
    html += `
      <tr onclick="openEditLead(${l.id})" style="cursor:pointer;">
        <td><strong>#${l.id}</strong></td>
        <td>${fStr}</td>
        <td>
          <div style="font-weight:600; color:var(--text);">${l.nombre}</div>
          <div style="font-size:11px; color:var(--text2);">${l.empresa || 'Particular'}</div>
        </td>
        <td>
          <div style="font-size:12px;"><i class="ti ti-phone" style="font-size:11px;"></i> ${l.telefono || '—'}</div>
          <div style="font-size:11px; color:var(--text2);"><i class="ti ti-mail" style="font-size:11px;"></i> ${l.correo || '—'}</div>
        </td>
        <td><span class="badge badge-secondary">${l.fuente || 'Desconocida'}</span></td>
        <td><span style="font-size:12px;">${l.producto || '—'}</span></td>
        <td><span style="font-size:12px; font-weight:500;">${l.responsable ? l.responsable.split(' - ')[0] : '—'}</span></td>
        <td><span class="status-pill status-${obtenerClaseEstado(l.estado)}">${l.estado || 'Nuevo'}</span></td>
        <td><span class="priority-indicator priority-${obtenerClasePrioridad(l.prioridad)}">${l.prioridad || 'Media'}</span></td>
        <td style="font-size:12px; font-weight:500; color:var(--green-dk);">${proxStr}</td>
        <td><strong>${totalMonto}</strong></td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;
}

function filtrarTodosLosLeads() {
  const q = document.getElementById('f-search').value.toLowerCase();
  const f = document.getElementById('f-fuente').value;
  const e = document.getElementById('f-estado').value;
  const r = document.getElementById('f-responsable').value;
  const p = document.getElementById('f-prioridad').value;

  const filtrados = LEADS.filter(l => {
    const matchQ = !q || 
      (l.nombre && l.nombre.toLowerCase().includes(q)) ||
      (l.empresa && l.empresa.toLowerCase().includes(q)) ||
      (l.telefono && l.telefono.includes(q)) ||
      (l.correo && l.correo.toLowerCase().includes(q)) ||
      (l.ciudad && l.ciudad.toLowerCase().includes(q));

    const matchF = !f || l.fuente === f;
    const matchE = !e || l.estado === e;
    const matchR = !r || l.responsable === r;
    const matchP = !p || l.prioridad === p;

    return matchQ && matchF && matchE && matchR && matchP;
  });

  renderTodosLosLeads(filtrados);
}

// ─── ACCIONES DEL FORMULARIO DE LEADS (AGREGAR / MODIFICAR / ELIMINAR) ────────
function openNewLead() {
  togglePanel(true);
}

function openEditLead(id) {
  const lead = LEADS.find(x => x.id === id);
  if (!lead) return;
  togglePanel(true, lead);
}

function togglePanel(show, lead = null) {
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('panel');
  if (!overlay || !panel) return;

  if (show) {
    llenarSelectsFormularioProspectos();
    if (lead) {
      currentLeadId = lead.id;
      document.getElementById('panel-title').innerHTML = `<i class="ti ti-edit"></i> Editar Lead #${lead.id}`;
      document.getElementById('btn-delete-lead').style.display = 'block';
      
      document.getElementById('n-nombre').value = lead.nombre || '';
      document.getElementById('n-empresa').value = lead.empresa || '';
      document.getElementById('n-telefono').value = lead.telefono || '';
      document.getElementById('n-correo').value = lead.correo || '';
      document.getElementById('n-ciudad').value = lead.ciudad || '';
      document.getElementById('n-estado-rep').value = lead.estado_rep || '';
      document.getElementById('n-fuente').value = lead.fuente || '';
      document.getElementById('n-producto').value = lead.producto || '';
      document.getElementById('n-presupuesto').value = lead.presupuesto || '';
      document.getElementById('n-responsable').value = lead.responsable || '';
      document.getElementById('n-prioridad').value = lead.prioridad || 'Media';
      document.getElementById('n-situacion').value = lead.estado || 'Nuevo';
      document.getElementById('n-seg').value = lead.proximoseg ? lead.proximoseg.slice(0, 16) : '';
      document.getElementById('n-notas').value = lead.notas || '';
    } else {
      currentLeadId = null;
      document.getElementById('panel-title').innerHTML = `<i class="ti ti-user-plus"></i> Nuevo Lead`;
      document.getElementById('btn-delete-lead').style.display = 'none';
      limpiarCamposFormulario();
    }
    overlay.classList.add('active');
    panel.classList.add('active');
  } else {
    overlay.classList.remove('active');
    panel.classList.remove('active');
    currentLeadId = null;
  }
}

function closePanel(e) {
  if (e && e.target.id === 'overlay') togglePanel(false);
}

function limpiarCamposFormulario() {
  ['n-nombre', 'n-empresa', 'n-telefono', 'n-correo', 'n-ciudad', 'n-estado-rep', 'n-seg', 'n-notas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function llenarSelectsFormularioProspectos() {
  inyectarOpcionesHtml('n-fuente', FUENTES);
  inyectarOpcionesHtml('n-producto', PRODUCTOS);
  inyectarOpcionesHtml('n-presupuesto', PRESUPUESTOS);
  inyectarOpcionesHtml('n-responsable', RESPONSABLES);
  inyectarOpcionesHtml('n-prioridad', PRIORIDADES);
  inyectarOpcionesHtml('n-situacion', ESTADOS_PIPELINE);
}

function inyectarOpcionesHtml(elementId, array) {
  const select = document.getElementById(elementId);
  if (!select) return;
  let html = "";
  array.forEach(v => { html += `<option value="${v}">${v}</option>`; });
  select.innerHTML = html;
}

async function guardarLeadFormulario() {
  const nombre = document.getElementById('n-nombre').value.trim();
  if (!nombre) {
    alert("⚠️ El nombre del prospecto es obligatorio.");
    return;
  }

  // VALIDACIÓN DE CONTRASEÑA OBLIGATORIA DEL MOMENTO
  if (!validarPasswordMomento()) return;

  const rawMonto = document.getElementById('n-presupuesto').value;
  const numericMonto = extraerNumeroMonto(rawMonto);

  const payload = {
    nombre,
    empresa: document.getElementById('n-empresa').value.trim(),
    telefono: document.getElementById('n-telefono').value.trim(),
    correo: document.getElementById('n-correo').value.trim(),
    ciudad: document.getElementById('n-ciudad').value.trim(),
    estado_rep: document.getElementById('n-estado-rep').value.trim(),
    fuente: document.getElementById('n-fuente').value,
    producto: document.getElementById('n-producto').value,
    presupuesto: rawMonto,
    monto_potencial: numericMonto,
    responsable: document.getElementById('n-responsable').value,
    prioridad: document.getElementById('n-prioridad').value,
    estado: document.getElementById('n-situacion').value,
    proximoseg: document.getElementById('n-seg').value || null,
    notas: document.getElementById('n-notas').value.trim(),
    updated_at: new Date().toISOString()
  };

  let res = null;
  if (currentLeadId) {
    // Modo Edición
    res = await supabaseRequest(`crm_leads?id=eq.${currentLeadId}`, 'PATCH', payload);
    if (res) {
      alert("✅ ¡Éxito! El Lead se modificó correctamente.");
      notify("🔄 Lead actualizado correctamente.");
    }
  } else {
    // Modo Nuevo Lead
    payload.created_at = new Date().toISOString();
    res = await supabaseRequest('crm_leads', 'POST', payload);
    if (res) {
      alert("✅ ¡Éxito! El nuevo Lead se agregó correctamente.");
      notify("➕ Nuevo Lead registrado.");
    }
  }

  if (res) {
    togglePanel(false);
    await fetchLeads();
  } else {
    alert("❌ Error en la comunicación con la base de datos.");
  }
}

async function eliminarLeadActual() {
  if (!currentLeadId) return;

  // VALIDACIÓN DE CONTRASEÑA OBLIGATORIA DEL MOMENTO
  if (!validarPasswordMomento()) return;

  const res = await supabaseRequest(`crm_leads?id=eq.${currentLeadId}`, 'DELETE');
  if (res) {
    alert("✅ ¡Éxito! El prospecto fue eliminado correctamente.");
    notify("🗑 Registro eliminado.");
    togglePanel(false);
    await fetchLeads();
  } else {
    alert("❌ Error al intentar eliminar el registro.");
  }
}

// ─── PESTAÑA: SEGUIMIENTO EN COLUMNAS (KANBAN KANBANIZADO) ─────────────────────
function renderSeguimientoColumnas() {
  const container = document.getElementById('tab-seguimiento');
  if (!container) return;

  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const limiteFuturo = new Date(hoy);
  limiteFuturo.setDate(limiteFuturo.getDate() + 30);

  let vencidosArr = [], hoyArr = [], futurosArr = [];

  LEADS.forEach(l => {
    if (!l.proximoseg || ['Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'].includes(l.estado)) return;
    const f = new Date(l.proximoseg);
    if (f < hoy) {
      vencidosArr.push(l);
    } else if (f >= hoy && f < manana) {
      hoyArr.push(l);
    } else if (f >= manana && f < limiteFuturo) {
      futurosArr.push(l);
    }
  });

  document.getElementById('count-vencidos').textContent = vencidosArr.length;
  document.getElementById('count-hoy').textContent = hoyArr.length;
  document.getElementById('count-futuros').textContent = futurosArr.length;

  const tVencidos = document.getElementById('seg-vencidos-list');
  const tHoy = document.getElementById('seg-hoy-list');
  const tFuturos = document.getElementById('seg-futuros-list');

  inyectarFilasSeguimiento(tVencidos, vencidosArr);
  inyectarFilasSeguimiento(tHoy, hoyArr);
  inyectarFilasSeguimiento(tFuturos, futurosArr);
}

function inyectarFilasSeguimiento(boxElement, leadsList) {
  if (!boxElement) return;
  if (leadsList.length === 0) {
    boxElement.innerHTML = `<div class="empty-column-msg">Sin seguimientos</div>`;
    return;
  }

  let html = "";
  leadsList.forEach(l => {
    const fStr = l.proximoseg ? new Date(l.proximoseg).toLocaleString('es-MX', {dateStyle:'short', timeStyle:'short'}) : '';
    html += `
      <div class="seg-card priority-border-${obtenerClasePrioridad(l.prioridad)}" onclick="openEditLead(${l.id})">
        <div class="seg-card-header">
          <strong>#${l.id} — ${l.nombre}</strong>
          <span class="status-pill status-${obtenerClaseEstado(l.estado)}" style="font-size:10px; padding:2px 6px;">${l.estado}</span>
        </div>
        <div class="seg-card-body">
          <div><i class="ti ti-phone"></i> ${l.telefono || '—'}</div>
          <div class="seg-card-date"><i class="ti ti-calendar-time"></i> ${fStr}</div>
        </div>
      </div>
    `;
  });
  boxElement.innerHTML = html;
}

// ─── PESTAÑA: DASHBOARD & REPORTES (MÉTRICAS Y GRÁFICOS) ─────────────────────
function renderDashboard() {
  const total = LEADS.length;
  const ganados = LEADS.filter(l => l.estado === 'Cerrado Ganado').length;
  const tasa = total > 0 ? Math.round((ganados / total) * 100) : 0;

  let montoCerradoTotal = 0;
  let pipelinePotencialTotal = 0;

  LEADS.forEach(l => {
    const valor = Number(l.monto_potencial) || extraerNumeroMonto(l.presupuesto);
    if (l.estado === 'Cerrado Ganado') {
      montoCerradoTotal += valor;
    } else if (!['Cerrado Perdido', 'Abandonado'].includes(l.estado)) {
      pipelinePotencialTotal += valor;
    }
  });

  document.getElementById('m-total').textContent = total;
  document.getElementById('m-ganados').textContent = ganados;
  document.getElementById('m-tasa').textContent = `${tasa}%`;
  document.getElementById('m-monto-cerrado').textContent = `$${montoCerradoTotal.toLocaleString('es-MX')}`;
  document.getElementById('m-monto-potencial').textContent = `$${pipelinePotencialTotal.toLocaleString('es-MX')}`;

  // Inyectar mini tabla de próximos seguimientos del Tablero Principal
  const dBody = document.getElementById('dashboard-table-body');
  if (dBody) {
    const proxArr = LEADS.filter(l => l.proximoseg && !['Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'].includes(l.estado))
                         .sort((a,b) => new Date(a.proximoseg) - new Date(b.proximoseg))
                         .slice(0, 5);

    if (proxArr.length === 0) {
      dBody.innerHTML = `<tr><td colspan="6" class="no-data-row">No hay seguimientos agendados</td></tr>`;
    } else {
      let html = "";
      proxArr.forEach(l => {
        const dStr = new Date(l.proximoseg).toLocaleString('es-MX', {dateStyle:'short', timeStyle:'short'});
        html += `
          <tr onclick="openEditLead(${l.id})" style="cursor:pointer;">
            <td><strong>#${l.id}</strong></td>
            <td>${l.nombre}</td>
            <td><span class="status-pill status-${obtenerClaseEstado(l.estado)}">${l.estado}</span></td>
            <td><span class="priority-indicator priority-${obtenerClasePrioridad(l.prioridad)}">${l.prioridad}</span></td>
            <td style="color:var(--green-dk); font-weight:500;">${dStr}</td>
            <td><strong>$${(Number(l.monto_potencial)||0).toLocaleString('es-MX')}</strong></td>
          </tr>
        `;
      });
      dBody.innerHTML = html;
    }
  }
}

function renderGraficosReportes() {
  const tContainer = document.getElementById('tab-reportes');
  if (!tContainer || tContainer.style.display === 'none') return;

  // 1. Gráfico por Estado del Pipeline
  const conteoE = {};
  ESTADOS_PIPELINE.forEach(e => conteoE[e] = 0);
  LEADS.forEach(l => { if (conteoE[l.estado] !== undefined) conteoE[l.estado]++; else conteoE[l.estado] = 1; });
  inyectarGraficoBarras('rep-chart-estados', conteoE);

  // 2. Gráfico por Origen / Fuente
  const conteoF = {};
  FUENTES.forEach(f => conteoF[f] = 0);
  LEADS.forEach(l => { if (conteoF[l.fuente] !== undefined) conteoF[l.fuente]++; });
  inyectarGraficoDonut('rep-chart-fuentes', conteoF);
}

function inyectarGraficoBarras(elementId, dataObj) {
  const container = document.getElementById(elementId);
  if (!container) return;

  const valores = Object.values(dataObj);
  const max = Math.max(...valores, 1);

  let html = `<div class="bar-chart-wrapper">`;
  Object.entries(dataObj).forEach(([k, v], idx) => {
    const pct = Math.round((v / max) * 100);
    const color = CHART_COLORS[idx % CHART_COLORS.length];
    html += `
      <div class="bar-chart-row">
        <span class="bar-chart-label">${k}</span>
        <div class="bar-chart-rail">
          <div class="bar-chart-fill" style="width:${pct}%; background:${color};"></div>
        </div>
        <span class="bar-chart-value">${v}</span>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

function inyectarGraficoDonut(elementId, dataObj) {
  const container = document.getElementById(elementId);
  if (!container) return;

  const total = Object.values(dataObj).reduce((a,b)=>a+b, 0) || 1;
  let html = `<div style="display:flex; flex-direction:column; gap:10px; width:100%;">`;
  
  Object.entries(dataObj).forEach(([k, v], idx) => {
    if (v === 0) return;
    const pct = Math.round((v / total) * 100);
    const color = CHART_COLORS[idx % CHART_COLORS.length];
    html += `
      <div style="display:flex; align-items:center; gap:10px; font-size:13px;">
        <span style="width:12px; height:12px; background:${color}; border-radius:3px; display:inline-block;"></span>
        <span style="flex:1;">${k}</span>
        <span style="font-weight:600;">${v} (${pct}%)</span>
      </div>
    `;
  });

  if (Object.values(dataObj).every(x => x === 0)) {
    html += `<div style="text-align:center; color:var(--text3); padding:20px;">No hay datos para representar</div>`;
  }
  html += `</div>`;
  container.innerHTML = html;
}

// ─── PESTAÑA: CONFIGURACIÓN Y MANTENIMIENTO DE ETIQUETAS NUBE ────────────────
function renderConfiguracionPanel() {
  inyectarTagsConfig('cfg-wrap-fuente', FUENTES, 'fuente');
  inyectarTagsConfig('cfg-wrap-producto', PRODUCTOS, 'producto');
  inyectarTagsConfig('cfg-wrap-presupuesto', PRESUPUESTOS, 'presupuesto');
  inyectarTagsConfig('cfg-wrap-situacion', ESTADOS_PIPELINE, 'situacion');

  // Inyectar Tabla de Administradores del Sistema
  const tbody = document.getElementById('cfg-admins-table-body');
  if (tbody) {
    let html = `
      <tr style="background: rgba(29, 158, 117, 0.05);">
        <td><strong>${AUTH_USER} (Principal)</strong></td>
        <td><span style="color:var(--green); font-weight:600;">Dueño del Sistema</span></td>
        <td>—</td>
      </tr>
    `;

    ADMINS.forEach(a => {
      if (a.user.toLowerCase() === AUTH_USER.toLowerCase()) return;
      html += `
        <tr>
          <td>${a.user}</td>
          <td>•••••••• / Administrador</td>
          <td><button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="eliminarAdminUser(${a.id})"><i class="ti ti-trash"></i> Eliminar</button></td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }
}

function inyectarTagsConfig(elementId, array, type) {
  const container = document.getElementById(elementId);
  if (!container) return;
  
  let html = "";
  array.forEach(v => {
    html += `
      <span class="config-tag">
        ${v}
        <span class="config-tag-close" onclick="eliminarConfigTag('${type}','${v}')">&times;</span>
      </span>
    `;
  });
  container.innerHTML = html || `<span style="font-size:12px; color:var(--text3);">Lista vacía</span>`;
}

// ACTUALIZAR CONTRASEÑA MAESTRA PRINCIPAL
async function actualizarPasswordMaestra() {
  const nuevoUser = document.getElementById('cfg-main-user').value.trim();
  const nuevoPass = document.getElementById('cfg-main-pass').value.trim();

  if (!nuevoUser || !nuevoPass) {
    alert("⚠️ El usuario y la contraseña maestra no pueden quedar vacíos.");
    return;
  }

  // VALIDACIÓN DE CONTRASEÑA OBLIGATORIA DEL MOMENTO
  if (!validarPasswordMomento()) return;

  const registroPrincipal = ADMINS.find(a => a.user.toLowerCase() === AUTH_USER.toLowerCase());
  let res = null;

  if (registroPrincipal) {
    res = await supabaseRequest(`config_admins?id=eq.${registroPrincipal.id}`, 'PATCH', { user: nuevoUser, pass: nuevoPass });
  } else {
    res = await supabaseRequest('config_admins', 'POST', { user: nuevoUser, pass: nuevoPass });
  }

  if (res) {
    AUTH_USER = nuevoUser;
    AUTH_PASS = nuevoPass;
    alert("✅ ¡Éxito! Contraseña maestra guardada y actualizada correctamente.");
    notify("🔐 Contraseña maestra cambiada.");
    await cargarConfiguracionesBase();
  } else {
    alert("❌ Error al guardar la contraseña en Supabase.");
  }
}

// AGREGAR ETIQUETAS DE CONFIGURACIÓN
async function agregarConfigTag(type) {
  const input = document.getElementById(`cfg-in-${type}`);
  if (!input) return;
  const valor = input.value.trim();

  if (!valor) {
    alert("⚠️ Ingresa un valor válido.");
    return;
  }

  // VALIDACIÓN DE CONTRASEÑA OBLIGATORIA DEL MOMENTO
  if (!validarPasswordMomento()) return;

  let tabla = "";
  if (type === 'fuente') tabla = "config_fuentes";
  if (type === 'producto') tabla = "config_productos";
  if (type === 'presupuesto') tabla = "config_presupuestos";
  if (type === 'situacion') tabla = "config_responsables"; // Reutiliza la tabla responsorios dinámica

  const res = await supabaseRequest(tabla, 'POST', { nombre: valor });
  if (res) {
    alert("✅ Elemento añadido correctamente.");
    input.value = "";
    await cargarConfiguracionesBase();
    notify("➕ Configuración actualizada.");
  } else {
    alert("❌ Error al agregar a la base de datos.");
  }
}

// ELIMINAR ETIQUETAS DE CONFIGURACIÓN
async function eliminarConfigTag(type, valor) {
  // VALIDACIÓN DE CONTRASEÑA OBLIGATORIA DEL MOMENTO
  if (!validarPasswordMomento()) return;

  let tabla = "";
  if (type === 'fuente') tabla = "config_fuentes";
  if (type === 'producto') tabla = "config_productos";
  if (type === 'presupuesto') tabla = "config_presupuestos";
  if (type === 'situacion') tabla = "config_responsables";

  const res = await supabaseRequest(`${tabla}?nombre=eq.${encodeURIComponent(valor)}`, 'DELETE');
  if (res) {
    alert("✅ Elemento eliminado correctamente.");
    await cargarConfiguracionesBase();
    notify("🗑 Configuración actualizada.");
  } else {
    alert("❌ Error al eliminar de la base de datos.");
  }
}

// AGREGAR CUENTA SECUNDARIA DE ADMINISTRADOR
async function agregarNuevoAdmin() {
  const userIn = document.getElementById('cfg-new-user');
  const passIn = document.getElementById('cfg-new-pass');
  if (!userIn || !passIn) return;

  const u = userIn.value.trim();
  const p = passIn.value.trim();

  if (!u || !p) {
    alert("⚠️ Rellena tanto el usuario como la contraseña.");
    return;
  }

  if (u.toLowerCase() === AUTH_USER.toLowerCase()) {
    alert("⚠️ No puedes usar el nombre del usuario principal.");
    return;
  }

  // VALIDACIÓN DE CONTRASEÑA OBLIGATORIA DEL MOMENTO
  if (!validarPasswordMomento()) return;

  const res = await supabaseRequest('config_admins', 'POST', { user: u, pass: p });
  if (res) {
    alert("✅ Nueva cuenta de Administrador añadida con éxito.");
    userIn.value = "";
    passIn.value = "";
    await cargarConfiguracionesBase();
    notify("👥 Administrador añadido.");
  } else {
    alert("❌ Error al guardar la cuenta secundaria.");
  }
}

// ELIMINAR CUENTA SECUNDARIA DE ADMINISTRADOR
async function eliminarAdminUser(id) {
  // VALIDACIÓN DE CONTRASEÑA OBLIGATORIA DEL MOMENTO
  if (!validarPasswordMomento()) return;

  const res = await supabaseRequest(`config_admins?id=eq.${id}`, 'DELETE');
  if (res) {
    alert("✅ Cuenta de administrador eliminada.");
    await cargarConfiguracionesBase();
    notify("🗑 Administrador eliminado.");
  } else {
    alert("❌ Error al eliminar la cuenta secundaria.");
  }
}

// ─── PROCESADORES INTERNOS AUXILIARES ─────────────────────────────────────────
function switchTab(tabId, element) {
  ['dashboard', 'leads', 'seguimiento', 'reportes', 'config'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.style.display = (t === tabId) ? 'block' : 'none';
  });
  
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) activeTab.classList.remove('active');
  element.classList.add('active');

  if (tabId === 'reportes') renderGraficosReportes();
}

function obtenerClaseEstado(st) {
  if (!st) return 'nuevo';
  const s = st.toLowerCase();
  if (s.includes('ganado')) return 'ganado';
  if (s.includes('perdido')) return 'perdido';
  if (s.includes('propuesta') || s.includes('negociación')) return 'proceso';
  if (s.includes('contactado') || s.includes('calificado')) return 'contacto';
  return 'nuevo';
}

function obtenerClasePrioridad(p) {
  if (!p) return 'media';
  const pr = p.toLowerCase();
  if (pr === 'alta') return 'alta';
  if (pr === 'baja') return 'baja';
  return 'media';
}

function extraerNumeroMonto(str) {
  if (!str) return 0;
  const match = str.replace(/[^0-9]/g, '');
  return match ? Number(match) : 0;
}

function notify(msg) {
  const n = document.getElementById('notification-toast');
  if (!n) return;
  n.innerHTML = `<i class="ti ti-check"></i> ${msg}`;
  n.classList.add('show');
  setTimeout(() => { n.classList.remove('show'); }, 3000);
}

function verificarRecordatoriosHoy(leads) {
  const hoyStr = new Date().toLocaleDateString('es-MX');
  const hoyLeads = leads ? leads.filter(l => {
    if (!l.proximoseg) return false;
    const f = new Date(l.proximoseg);
    return f.toLocaleDateString('es-MX') === hoyStr && !['Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'].includes(l.estado);
  }) : [];

  if (hoyLeads.length > 0) {
    setTimeout(() => {
      alert(`📢 ¡Recordatorio!\\nTienes (${hoyLeads.length}) seguimientos agendados para hoy.`);
    }, 1000);
  }
}

function exportCSV() {
  if (LEADS.length === 0) return;
  let csv = "ID,Nombre,Empresa,Telefono,Correo,Ciudad,EstadoRep,Fuente,Producto,Presupuesto,Responsable,Prioridad,EstadoPipeline,ProximoSeg\n";
  LEADS.forEach(l => {
    csv += `"${l.id}","${l.nombre}","${l.empresa || ''}","${l.telefono || ''}","${l.correo || ''}","${l.ciudad || ''}","${l.estado_rep || ''}","${l.fuente}","${l.producto}","${l.presupuesto}","${l.responsable}","${l.prioridad}","${l.estado || 'Nuevo'}","${l.proximoseg || ''}"\n`;
  });
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `Leads_Herbolaria_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.onload = function() {
  if (sessionStorage.getItem('crm_logged_in') === 'true') {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    inicializarSistema();
  }
};
