// CREDENCIALES EXCLUSIVAS ACTUALIZADAS
const AUTH_USER = "Herbolaria";
const AUTH_PASS = "Saludable*";

// Lista dinámica de administradores adicionales (se guardará en Storage)
let ADMINS = JSON.parse(localStorage.getItem('cfg_admins')) || [];
let editingAdminIndex = null; // Controla si se está editando un administrador existente

// ARRAYS EDITABLES CORREGIDOS (Dejados completamente limpios sin datos iniciales)
let FUENTES = JSON.parse(localStorage.getItem('cfg_fuentes')) || [];
let PRODUCTOS = JSON.parse(localStorage.getItem('cfg_productos')) || [];
let PRESUPUESTOS = JSON.parse(localStorage.getItem('cfg_presupuestos')) || [];

// ARRAYS QUE SÍ CONSERVAN SUS DATOS SOLICITADOS
let RESPONSABLES = JSON.parse(localStorage.getItem('cfg_responsables')) || ['Marketing Digital', 'Ventas Online', 'Gerencia de Ventas', 'Gerencia General'];

// Carga inicial obligatoria del equipo de trabajo solicitado
let EJECUTIVOS = JSON.parse(localStorage.getItem('cfg_ejecutives'));
if (!EJECUTIVOS || EJECUTIVOS.length === 0) {
  EJECUTIVOS = [
    "Pilar Gonzalez - marketing digital",
    "Ana Maria Alonso - Ventas Online",
    "Yessica Carrillo - Gerencia de Ventas (Ventas Mayoreo)",
    "Emmanuel Zúñiga - Gerencia General"
  ];
  localStorage.setItem('cfg_ejecutives', JSON.stringify(EJECUTIVOS));
}

// ARRAYS ESTRÍCTAMENTE FIJOS REQUERIDOS
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
  'Propuesta Enviada': '#BA7517', 'En Negociación': '#1D9E75',
  'Cerrado Ganado': '#27500A', 'Cerrado Perdido': '#A32D2D', 'Abandonado': '#888780'
};

let leads = JSON.parse(localStorage.getItem('crm_leads') || '[]');
let nextId = parseInt(localStorage.getItem('crm_nextId') || '1');

function save() {
  localStorage.setItem('crm_leads', JSON.stringify(leads));
  localStorage.setItem('crm_nextId', String(nextId));
}

function saveConfigStorage() {
  localStorage.setItem('cfg_fuentes', JSON.stringify(FUENTES));
  localStorage.setItem('cfg_productos', JSON.stringify(PRODUCTOS));
  localStorage.setItem('cfg_presupuestos', JSON.stringify(PRESUPUESTOS));
  localStorage.setItem('cfg_responsables', JSON.stringify(RESPONSABLES));
  localStorage.setItem('cfg_ejecutives', JSON.stringify(EJECUTIVOS));
  localStorage.setItem('cfg_admins', JSON.stringify(ADMINS));
}

// ─── CONTROL DE RESPALDO MENSUAL AUTOMÁTICO (Cada día 1, máximo 3 avisos) ─────
function verificarRespaldoMensual() {
  const hoyStr = today(); // Formato YYYY-MM-DD
  const diaDelMes = new Date().getDate();

  // Ejecutar solo si es el primer día de cualquier mes
  if (diaDelMes === 1) {
    let control = JSON.parse(localStorage.getItem('crm_backup_control')) || { fecha: '', conteo: 0 };
    
    // Si cambió el mes o es un nuevo día primero, reiniciamos el contador diario
    if (control.fecha !== hoyStr) {
      control.fecha = hoyStr;
      control.conteo = 0;
    }

    // Si aún no se ha interactuado 3 veces en este día de inicio de mes
    if (control.conteo < 3) {
      control.conteo += 1;
      localStorage.setItem('crm_backup_control', JSON.stringify(control));

      // Ventana emergente nativa condicional
      setTimeout(() => {
        const respuesta = confirm("¡Es inicio de mes! ¿Deseas descargar el respaldo de la información en formato compatible con Excel (CSV)?");
        if (respuesta) {
          exportCSV();
        }
      }, 600);
    }
  }
}

// ─── CONTROL DE AUTENTICACIÓN (LOGIN) ────────────────────────────────────────
function handleLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const errorDiv = document.getElementById('login-error');

  const isAdminAlterno = ADMINS.some(admin => admin.user === u && admin.pass === p);

  if ((u === AUTH_USER && p === AUTH_PASS) || isAdminAlterno) {
    sessionStorage.setItem('crm_logged_in', 'true');
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    errorDiv.textContent = "";
    renderDashboard();
    verificarRespaldoMensual();
  } else {
    errorDiv.textContent = "Usuario o contraseña incorrectos.";
  }
}

function handleLogout() {
  sessionStorage.removeItem('crm_logged_in');
  document.getElementById('login-user').value = "";
  document.getElementById('login-pass').value = "";
  document.getElementById('main-layout').style.display = 'none';
  document.getElementById('login-container').style.display = 'flex';
}

function checkPasswordPrompt(actionMessage) {
  const input = prompt(`Acción Protegida: ${actionMessage}\nPor favor introduce tu contraseña para confirmar:`);
  if (input === null) return false; 
  
  const passValida = (input === AUTH_PASS) || ADMINS.some(admin => admin.pass === input);

  if (passValida) return true;
  alert('❌ Contraseña incorrecta. Acción cancelada.');
  return false;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { let x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) };
const fmxn = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);

function notify(msg) {
  const n = document.getElementById('notif');
  if (n) {
    n.textContent = msg;
    n.classList.add('show');
    setTimeout(() => n.classList.remove('show'), 2800);
  }
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
function switchTab(tab, el) {
  ['dashboard', 'leads', 'seguimiento', 'reportes', 'config'].forEach(t => document.getElementById('tab-' + t).style.display = 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).style.display = 'block';
  el.classList.add('active');
  const render = { dashboard: renderDashboard, leads: renderLeads, seguimiento: renderSeguimiento, reportes: renderReportes, config: renderConfig };
  render[tab]();
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
  const total = leads.length;
  const ganados = leads.filter(l => l.estadoLead === 'Cerrado Ganado').length;
  const perdidos = leads.filter(l => l.estadoLead === 'Cerrado Perdido').length;
  const abandonados = leads.filter(l => l.estadoLead === 'Abandonado').length;
  const tasa = total > 0 ? Math.round(ganados / total * 100) : 0;
  const monto = leads.reduce((a, l) => a + (l.montoCerrado || 0), 0);
  const potentiel = leads.reduce((a, l) => a + (l.montoPotencial || 0), 0);
  const vencidos = leads.filter(l => l.proximoSeg && l.proximoSeg < today() && !['Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'].includes(l.estadoLead)).length;

  const pF = {}; leads.forEach(l => { pF[l.fuente] = (pF[l.fuente] || 0) + 1 });
  const fSort = Object.entries(pF).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxF = fSort[0] ? fSort[0][1] : 1;

  const pE = {}; ESTADOS.forEach(e => pE[e] = 0); leads.forEach(l => { pE[l.estadoLead] = (pE[l.estadoLead] || 0) + 1 });

  const pR = {}; leads.forEach(l => { pR[l.responsable] = (pR[l.responsable] || 0) + 1 });
  const rSort = Object.entries(pR).sort((a, b) => b[1] - a[1]);
  const maxR = rSort[0] ? rSort[0][1] : 1;

  const pP = {}; leads.forEach(l => l.producto.forEach(p => { pP[p] = (pP[p] || 0) + 1 }));
  const prSort = Object.entries(pP).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxP = prSort[0] ? prSort[0][1] : 1;

  const activos = leads.filter(l => !['Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'].includes(l.estadoLead)).sort((a, b) => a.proximoSeg > b.proximoSeg ? 1 : -1).slice(0, 6);

  document.getElementById('tab-dashboard').innerHTML = `
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Total Leads</div><div class="kpi-val blue">${total}</div><div class="kpi-sub">Acumulado</div></div>
    <div class="kpi"><div class="kpi-label">Cerrados Ganados</div><div class="kpi-val green">${ganados}</div><div class="kpi-sub">Conversiones</div></div>
    <div class="kpi"><div class="kpi-label">Tasa de Conversión</div><div class="kpi-val ${tasa >= 30 ? 'green' : tasa >= 15 ? 'amber' : 'red'}">${tasa}%</div><div class="progress"><div class="progress-fill" style="width:${tasa}%"></div></div></div>
    <div class="kpi"><div class="kpi-label">Monto Cerrado</div><div class="kpi-val green">${fmxn(monto)}</div><div class="kpi-sub">Ventas reales</div></div>
    <div class="kpi"><div class="kpi-label">Pipeline Potencial</div><div class="kpi-val blue">${fmxn(potentiel)}</div><div class="kpi-sub">Oportunidades abiertas</div></div>
    <div class="kpi"><div class="kpi-label">Seg. Vencidos</div><div class="kpi-val ${vencidos > 0 ? 'red' : 'green'}">${vencidos}</div><div class="kpi-sub">Requieren atención</div></div>
    <div class="kpi"><div class="kpi-label">Abandonados</div><div class="kpi-val amber">${abandonados}</div><div class="kpi-sub">Prospectos perdidos</div></div>
    <div class="kpi"><div class="kpi-label">Cerrados Perdidos</div><div class="kpi-val red">${perdidos}</div></div>
  </div>
  <div class="charts-grid">
    <div class="chart-card">
      <div class="chart-title"><i class="ti ti-antenna-bars-5"></i> Leads por fuente</div>
      <div class="bar-chart">${fSort.length ? fSort.map(([k, v], i) => `<div class="bar-row"><div class="bar-label" title="${k}">${k.length > 13 ? k.slice(0, 12) + '…' : k}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v / maxF * 100)}%;background:${BAR_COLORS[i % 10]}"></div></div><div class="bar-count">${v}</div></div>`).join('') : '<div class="empty">Sin registros</div>'}</div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><i class="ti ti-chart-pie"></i> Estado del pipeline</div>
      <div class="bar-chart">${total > 0 ? ESTADOS.filter(e => pE[e]).map((e, i) => `<div class="bar-row"><div class="bar-label" style="font-size:11px" title="${e}">${e.length > 14 ? e.slice(0, 13) + '…' : e}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(pE[e] / total * 100)}%;background:${ESTADO_COLORS[e]}"></div></div><div class="bar-count">${pE[e]}</div></div>`).join('') : '<div class="empty">Sin registros</div>'}</div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><i class="ti ti-users"></i> Leads por responsable</div>
      <div class="bar-chart">${rSort.length ? rSort.map(([k, v], i) => `<div class="bar-row"><div class="bar-label" style="font-size:11px" title="${k}">${k.length > 14 ? k.slice(0, 13) + '…' : k}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v / maxR * 100)}%;background:${BAR_COLORS[(i + 2) % 10]}"></div></div><div class="bar-count">${v}</div></div>`).join('') : '<div class="empty">Sin registros</div>'}</div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><i class="ti ti-leaf"></i> Productos con más interés</div>
      <div class="bar-chart">${prSort.length ? prSort.map(([k, v], i) => `<div class="bar-row"><div class="bar-label" style="font-size:11px" title="${k}">${k.length > 14 ? k.slice(0, 13) + '…' : k}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v / maxP * 100)}%;background:${BAR_COLORS[(i + 4) % 10]}"></div></div><div class="bar-count">${v}</div></div>`).join('') : '<div class="empty">Sin registros</div>'}</div>
    </div>
  </div>
  <div class="card">
    <div style="font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;display:flex;align-items:center;gap:6px"><i class="ti ti-clock"></i> Próximos seguimientos activos</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Nombre</th><th>Estado</th><th>Responsable</th><th>Próximo Seg.</th><th>Monto Pot.</th></tr></thead>
        <tbody>${activos.length ? activos.map(l => `<tr onclick="openLead(${l.id})"><td style="font-size:12px;color:var(--text2)">#${l.id}</td><td><div class="td-name">${l.nombre}</div><div class="td-muted">${l.empresa}</div></td><td><span class="badge ${STATUS_CLASS[l.estadoLead] || ''}">${l.estadoLead}</span></td><td style="font-size:12px">${l.responsable}</td><td style="font-size:12px;font-weight:${l.proximoSeg < today() ? '600' : '400'};color:${l.proximoSeg < today() ? '#a32d2d' : 'var(--text)'}">${l.proximoSeg || '—'}</td><td style="font-size:12px;font-weight:500;color:var(--green)">${fmxn(l.montoPotencial)}</td></tr>`).join('') : '<tr><td colspan="6"><div class="empty">No hay seguimientos agendados</div></td></tr>'}</tbody>
      </table>
    </div>
  </div>`;
}

// ─── LEADS TABLE ─────────────────────────────────────────────────────────────
function renderLeads() {
  document.getElementById('tab-leads').innerHTML = `
  <div class="filters">
    <input type="text" id="search-q" placeholder="🔍  Buscar nombre, empresa, teléfono..." oninput="filterTable()" style="min-width:240px">
    <select id="f-fuente" onchange="filterTable()"><option value="">Todas las fuentes</option>${FUENTES.map(f => `<option>${f}</option>`).join('')}</select>
    <select id="f-estado" onchange="filterTable()"><option value="">Todos los estados</option>${ESTADOS.map(e => `<option>${e}</option>`).join('')}</select>
    <select id="f-resp" onchange="filterTable()"><option value="">Todos los responsables</option>${RESPONSABLES.map(r => `<option>${r}</option>`).join('')}</select>
    <select id="f-prio" onchange="filterTable()"><option value="">Todas las prioridades</option>${PRIORIDADES.map(p => `<option>${p}</option>`).join('')}</select>
    <span class="count-label" id="count-lbl"></span>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>ID</th><th>Fecha</th><th>Nombre / Empresa</th><th>Contacto</th><th>Fuente</th><th>Producto(s)</th><th>Responsable</th><th>Estado</th><th>Prioridad</th><th>Próx. Seg.</th><th>Monto Pot.</th><th></th></tr></thead>
      <tbody id="leads-tbody"></tbody>
    </table>
  </div>`;
  filterTable();
}

function filterTable() {
  const q = (document.getElementById('search-q')?.value || '').toLowerCase();
  const fF = document.getElementById('f-fuente')?.value || '';
  const fE = document.getElementById('f-estado')?.value || '';
  const fR = document.getElementById('f-resp')?.value || '';
  const fP = document.getElementById('f-prio')?.value || '';
  
  const fil = leads.filter(l => {
    if (q && !l.nombre.toLowerCase().includes(q) && !l.empresa.toLowerCase().includes(q) && !String(l.telefono).includes(q)) return false;
    if (fF && l.fuente !== fF) return false;
    if (fE && l.estadoLead !== fE) return false;
    if (fR && l.responsable !== fR) return false;
    if (fP && l.prioridad !== fP) return false;
    return true;
  });
  
  const lbl = document.getElementById('count-lbl');
  if (lbl) lbl.textContent = `${fil.length} lead${fil.length !== 1 ? 's' : ''}`;
  const tbody = document.getElementById('leads-tbody');
  if (!tbody) return;
  if (!fil.length) { tbody.innerHTML = `<tr><td colspan="12"><div class="empty">Sin resultados para estos filtros o no has agregado leads aún.</div></td></tr>`; return; }
  
  tbody.innerHTML = fil.map(l => `
    <tr onclick="openLead(${l.id})">
      <td style="font-size:12px;color:var(--text2)">#${l.id}</td>
      <td style="font-size:12px">${l.fechaIngreso}</td>
      <td><div class="td-name">${l.nombre}</div><div class="td-muted">${l.empresa}</div></td>
      <td><a class="wa-link" href="https://wa.me/52${l.telefono}" onclick="event.stopPropagation()" target="_blank"><i class="ti ti-brand-whatsapp"></i> ${l.telefono}</a></td>
      <td style="font-size:12px">${l.fuente}</td>
      <td style="font-size:12px">${l.producto.join(', ')}</td>
      <td style="font-size:12px">${l.responsable}</td>
      <td><span class="badge ${STATUS_CLASS[l.estadoLead] || ''}">${l.estadoLead}</span></td>
      <td><span class="badge ${PRI_CLASS[l.prioridad] || ''}">${l.prioridad}</span></td>
      <td style="font-size:12px;color:${l.proximoSeg && l.proximoSeg < today() ? '#a32d2d' : 'var(--text)'};font-weight:${l.proximoSeg && l.proximoSeg < today() ? '600' : '400'}">${l.proximoSeg || '—'}</td>
      <td style="font-size:12px;font-weight:500;color:var(--green)">${fmxn(l.montoPotencial)}</td>
      <td><button class="btn" style="padding:5px 10px;font-size:12px" onclick="event.stopPropagation();openLead(${l.id})"><i class="ti ti-edit"></i></button></td>
    </tr>`).join('');
}

// ─── SEGUIMIENTO ──────────────────────────────────────────────────────────────
function renderSeguimiento() {
  const hoy = today();
  const activos = l => !['Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'].includes(l.estadoLead);
  const vencidos = leads.filter(l => l.proximoSeg && l.proximoSeg < hoy && activos(l));
  const paraHoy = leads.filter(l => l.proximoSeg === hoy && activos(l));
  const proximos = leads.filter(l => l.proximoSeg > hoy && activos(l)).sort((a, b) => a.proximoSeg > b.proximoSeg ? 1 : -1).slice(0, 15);

  function miniTable(arr) {
    if (!arr.length) return `<p style="font-size:13px;color:var(--text2);font-style:italic;padding:8px 0;margin-bottom:16px">Sin leads en esta categoría ✓</p>`;
    return `<div class="table-wrap" style="margin-bottom:20px"><table><thead><tr><th>ID</th><th>Nombre</th><th>Fuente</th><th>Estado</th><th>Responsable</th><th>Fecha Seg.</th><th></th></tr></thead>
    <tbody>${arr.map(l => `<tr onclick="openLead(${l.id})"><td style="font-size:12px;color:var(--text2)">#${l.id}</td><td><div class="td-name">${l.nombre}</div><div class="td-muted">${l.empresa}</div></td><td style="font-size:12px">${l.fuente}</td><td><span class="badge ${STATUS_CLASS[l.estadoLead] || ''}">${l.estadoLead}</span></td><td style="font-size:12px">${l.responsable}</td><td style="font-size:12px;font-weight:500">${l.proximoSeg}</td><td><button class="btn" style="padding:5px 10px;font-size:12px" onclick="event.stopPropagation();openLead(${l.id})"><i class="ti ti-edit"></i></button></td></tr>`).join('')}</tbody></table></div>`;
  }

  document.getElementById('tab-seguimiento').innerHTML = `
  <div class="seg-section-title"><i class="ti ti-alert-triangle" style="color:#a32d2d;font-size:20px"></i><span style="color:#a32d2d">Vencidos (${vencidos.length})</span></div>
  ${miniTable(vencidos)}
  <div class="seg-section-title"><i class="ti ti-calendar" style="color:#ba7517;font-size:20px"></i><span style="color:#ba7517">Para hoy (${paraHoy.length})</span></div>
  ${miniTable(paraHoy)}
  <div class="seg-section-title"><i class="ti ti-calendar-event" style="color:#185fa5;font-size:20px"></i><span style="color:#185fa5">Próximos 14 días (${proximos.length})</span></div>
  ${miniTable(proximos)}`;
}

// ─── REPORTES ─────────────────────────────────────────────────────────────────
function renderReportes() {
  const total = leads.length;
  const ganados = leads.filter(l => l.estadoLead === 'Cerrado Ganado');
  const tasa = total > 0 ? Math.round(ganados.length / total * 100) : 0;
  const totalMonto = leads.reduce((a, l) => a + (l.montoCerrado || 0), 0);
  const avgVenta = ganados.length > 0 ? Math.round(totalMonto / ganados.length) : 0;

  const meses = {};
  leads.forEach(l => { const m = l.fechaIngreso.slice(0, 7); meses[m] = (meses[m] || 0) + 1 });
  const mSort = Object.entries(meses).sort((a, b) => a[0] > b[0] ? 1 : -1).slice(-6);
  const maxM = mSort.reduce((a, [, v]) => Math.max(a, v), 0) || 1;

  const canal = {};
  ganados.forEach(l => { canal[l.fuente] = (canal[l.fuente] || 0) + (l.montoCerrado || 0) });
  const cSort = Object.entries(canal).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxC = cSort[0] ? cSort[0][1] : 1;

  const resp = {};
  ganados.forEach(l => { resp[l.responsable] = (resp[l.responsable] || 0) + 1 });
  const respSort = Object.entries(resp).sort((a, b) => b[1] - a[1]);
  const maxRG = respSort[0] ? respSort[0][1] : 1;

  document.getElementById('tab-reportes').innerHTML = `
  <div class="kpi-grid" style="margin-bottom:20px">
    <div class="kpi"><div class="kpi-label">Leads este mes</div><div class="kpi-val blue">${mSort.slice(-1)[0] ? mSort.slice(-1)[0][1] : 0}</div></div>
    <div class="kpi"><div class="kpi-label">Conversión global</div><div class="kpi-val ${tasa >= 30 ? 'green' : tasa >= 15 ? 'amber' : 'red'}">${tasa}%</div></div>
    <div class="kpi"><div class="kpi-label">Venta promedio</div><div class="kpi-val green">${fmxn(avgVenta)}</div></div>
    <div class="kpi"><div class="kpi-label">Total vendido</div><div class="kpi-val green">${fmxn(totalMonto)}</div></div>
  </div>
  <div class="charts-grid">
    <div class="chart-card">
      <div class="chart-title"><i class="ti ti-trending-up"></i> Leads por mes</div>
      ${mSort.length ? `<div class="bar-chart">${mSort.map(([k, v], i) => `<div class="bar-row"><div class="bar-label">${k}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v / maxM * 100)}%;background:${BAR_COLORS[i]}"></div></div><div class="bar-count">${v}</div></div>`).join('')}</div>` : '<div class="empty">Sin datos</div>'}
    </div>
    <div class="chart-card">
      <div class="chart-title"><i class="ti ti-currency-dollar"></i> Ventas cerradas por canal</div>
      ${cSort.length ? `<div class="bar-chart">${cSort.map(([k, v], i) => `<div class="bar-row"><div class="bar-label" title="${k}" style="font-size:11px">${k.length > 12 ? k.slice(0, 11) + '…' : k}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v / maxC * 100)}%;background:${BAR_COLORS[(i + 3) % 10]}"></div></div><div class="bar-count" style="font-size:10px;width:70px">${fmxn(v)}</div></div>`).join('')}</div>` : '<div class="empty">Sin ventas cerradas aún.</div>'}
    </div>
    <div class="chart-card">
      <div class="chart-title"><i class="ti ti-trophy"></i> Cierres por responsable</div>
      ${respSort.length ? `<div class="bar-chart">${respSort.map(([k, v], i) => `<div class="bar-row"><div class="bar-label" style="font-size:11px" title="${k}">${k.length > 14 ? k.slice(0, 13) + '…' : k}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v / maxRG * 100)}%;background:${BAR_COLORS[(i + 5) % 10]}"></div></div><div class="bar-count">${v}</div></div>`).join('')}</div>` : '<div class="empty">Sin datos</div>'}
    </div>
  </div>`;
}

// ─── PANEL LEAD ──────────────────────────────────────────────────────────────
function openLead(id) {
  const l = leads.find(x => x.id === id);
  if (!l) return;
  document.getElementById('panel-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
      <div class="avatar">${l.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
      <div style="flex:1"><div style="font-size:16px;font-weight:600">${l.nombre}</div><div style="font-size:12px;color:var(--text2)">${l.empresa}</div></div>
      <span class="badge ${STATUS_CLASS[l.estadoLead] || ''}">${l.estadoLead}</span>
    </div>
    <div class="section-sep"><i class="ti ti-info-circle"></i> Datos del lead</div>
    <div class="field-row">
      <div class="field-group"><div class="field-label">ID</div><div class="field-val">#${l.id}</div></div>
      <div class="field-group"><div class="field-label">Fecha ingreso</div><div class="field-val">${l.fechaIngreso}</div></div>
    </div>
    <div class="field-row">
      <div class="field-group"><div class="field-label">Teléfono</div><div class="field-val"><a class="wa-link" href="https://wa.me/52${l.telefono}" target="_blank"><i class="ti ti-brand-whatsapp"></i> ${l.telefono}</a></div></div>
      <div class="field-group"><div class="field-label">Ciudad / Estado</div><div class="field-val">${l.ciudad}, ${l.estado_geo}</div></div>
    </div>
    <div class="field-row">
      <div class="field-group"><div class="field-label">Fuente</div><div class="field-val">${l.fuente}</div></div>
      <div class="field-group"><div class="field-label">Presupuesto</div><div class="field-val">${l.presupuesto || '—'}</div></div>
    </div>
    <div class="field-group"><div class="field-label">Productos de interés</div><div class="field-val">${l.producto.join(' · ')}</div></div>
    <div class="field-row">
      <div class="field-group"><div class="field-label">Responsable</div><div class="field-val">${l.responsable}</div></div>
      <div class="field-group"><div class="field-label">Ejecutivo</div><div class="field-val">${l.ejecutivo}</div></div>
    </div>
    <div class="field-row">
      <div class="field-group"><div class="field-label">Monto potencial</div><div class="field-val" style="color:var(--green);font-weight:600">${fmxn(l.montoPotencial)}</div></div>
      ${l.montoCerrado > 0 ? `<div class="field-group"><div class="field-label">Monto cerrado</div><div class="field-val" style="color:#27500A;font-weight:600">${fmxn(l.montoCerrado)}</div></div>` : ''}
    </div>
    <div class="section-sep"><i class="ti ti-edit"></i> Actualizar</div>
    <div class="form-group"><label>Estado del lead</label>
      <select id="e-estado">${ESTADOS.map(e => `<option value="${e}" ${l.estadoLead === e ? 'selected' : ''}>${e}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Prioridad</label>
      <select id="e-prio">${PRIORIDADES.map(p => `<option value="${p}" ${l.prioridad === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label>Próximo seguimiento</label>
      <input type="date" id="e-seg" value="${l.proximoSeg}">
    </div>
    <div class="form-group"><label>Monto potencial (MXN)</label>
      <input type="number" id="e-monto" value="${l.montoPotencial}">
    </div>
    <div class="form-group"><label>Monto cerrado (MXN)</label>
      <input type="number" id="e-cerrado" value="${l.montoCerrado}">
    </div>
    <div class="form-group"><label>Notas de ventas</label>
      <textarea id="e-notas">${l.notasVentas}</textarea>
    </div>
    <div class="form-group"><label>Notas gerencia</label>
      <textarea id="e-gcia">${l.notasGerencia}</textarea>
    </div>
    <div class="panel-actions">
      <button class="btn btn-primary" style="flex:1" onclick="saveLead(${l.id})"><i class="ti ti-device-floppy"></i> Guardar</button>
      <button class="btn btn-danger" onclick="deleteLead(${l.id})"><i class="ti ti-trash"></i></button>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-top:10px;text-align:right">Última actualización: ${l.ultimaActualizacion}</div>`;
  document.getElementById('overlay').classList.add('open');
}

function saveLead(id) {
  const l = leads.find(x => x.id === id);
  if (!l) return;
  l.estadoLead = document.getElementById('e-estado').value;
  l.prioridad = document.getElementById('e-prio').value;
  
  l.proximoSeg = addDays(new Date(), 1); 
  
  l.montoPotencial = parseInt(document.getElementById('e-monto').value) || 0;
  l.montoCerrado = parseInt(document.getElementById('e-cerrado').value) || 0;
  l.notasVentas = document.getElementById('e-notas').value;
  l.notasGerencia = document.getElementById('e-gcia').value;
  l.ultimaActualizacion = today();
  save();
  closePanel(null);
  const tab = document.querySelector('.tab.active');
  if (tab) tab.click();
  notify('✅ Lead #' + id + ' actualizado');
}

function deleteLead(id) {
  if (!checkPasswordPrompt('Eliminar permanentemente a un Lead')) return;
  leads = leads.filter(l => l.id !== id);
  save();
  closePanel(null);
  const tab = document.querySelector('.tab.active');
  if (tab) tab.click();
  notify('🗑 Lead eliminado');
}

// ─── NUEVO LEAD ───────────────────────────────────────────────────────────────
function openNewLead() {
  document.getElementById('panel-content').innerHTML = `
    <div class="panel-title"><i class="ti ti-user-plus" style="color:var(--green)"></i> Nuevo Lead</div>
    <div class="section-sep">Datos de contacto</div>
    <div class="form-group"><label>Nombre completo *</label><input type="text" id="n-nombre" placeholder="Nombre del prospecto"></div>
    <div class="form-group"><label>Empresa</label><input type="text" id="n-empresa" placeholder="Empresa u organización"></div>
    <div class="form-group"><label>Teléfono / WhatsApp</label><input type="text" id="n-tel" placeholder="10 dígitos"></div>
    <div class="form-group"><label>Correo electrónico</label><input type="email" id="n-correo" placeholder="correo@ejemplo.com"></div>
    <div class="field-row">
      <div class="form-group"><label>Ciudad</label><input type="text" id="n-ciudad" placeholder="Ciudad"></div>
      <div class="form-group"><label>Estado</label><input type="text" id="n-estado" placeholder="Estado"></div>
    </div>
    <div class="section-sep">Información comercial</div>
    <div class="form-group"><label>Fuente *</label><select id="n-fuente"><option value="">Seleccionar fuente…</option>${FUENTES.map(f => `<option>${f}</option>`).join('')}</select></div>
    <div class="form-group"><label>Producto de interés</label><select id="n-prod"><option value="">Seleccionar producto…</option>${PRODUCTOS.map(p => `<option>${p}</option>`).join('')}</select></div>
    <div class="form-group"><label>Presupuesto estimado</label><select id="n-pres"><option value="">Seleccionar…</option>${PRESUPUESTOS.map(p => `<option>${p}</option>`).join('')}</select></div>
    <div class="form-group"><label>Responsable comercial</label><select id="n-resp"><option value="">Seleccionar…</option>${RESPONSABLES.map(r => `<option>${r}</option>`).join('')}</select></div>
    <div class="form-group"><label>Ejecutivo asignado</label><select id="n-ejec"><option value="">Seleccionar…</option>${EJECUTIVOS.map(e => `<option>${e}</option>`).join('')}</select></div>
    <div class="field-row">
      <div class="form-group"><label>Prioridad</label><select id="n-prio">${PRIORIDADES.map(p => `<option>${p}</option>`).join('')}</select></div>
      <div class="form-group"><label>Monto potencial (MXN)</label><input type="number" id="n-monto" placeholder="0"></div>
    </div>
    <div class="form-group"><label>Próximo seguimiento</label><input type="date" id="n-seg" value="${addDays(new Date(), 1)}"></div>
    <div class="form-group"><label>Notas iniciales</label><textarea id="n-notas" placeholder="Contexto, necesidades, observaciones…"></textarea></div>
    <button class="btn btn-primary" style="width:100%;margin-top:8px;justify-content:center" onclick="createLead()"><i class="ti ti-plus"></i> Crear lead</button>`;
  document.getElementById('overlay').classList.add('open');
}

function createLead() {
  const nombre = document.getElementById('n-nombre').value.trim();
  const fuente = document.getElementById('n-fuente').value;
  if (!nombre) { alert('El nombre es obligatorio.'); return; }
  if (!fuente) { alert('Selecciona la fuente del lead.'); return; }
  
  if (!checkPasswordPrompt('Crear un nuevo Lead en el sistema')) return;

  const l = {
    id: nextId++, fechaIngreso: today(), nombre,
    empresa: document.getElementById('n-empresa').value || 'Sin empresa',
    telefono: document.getElementById('n-tel').value || '',
    whatsapp: '', correo: document.getElementById('n-correo').value || '',
    ciudad: document.getElementById('n-ciudad').value || '',
    estado_geo: document.getElementById('n-estado').value || '',
    pais: 'México', fuente,
    producto: [document.getElementById('n-prod').value].filter(Boolean),
    presupuesto: document.getElementById('n-pres').value || '',
    responsable: document.getElementById('n-resp').value || '',
    ejecutivo: document.getElementById('n-ejec').value || '',
    estadoLead: 'Nuevo', prioridad: document.getElementById('n-prio').value || 'Media',
    proximoSeg: document.getElementById('n-seg').value || '', fechaCierre: '',
    montoPotencial: parseInt(document.getElementById('n-monto').value) || 0,
    montoCerrado: 0, notasVentas: document.getElementById('n-notas').value || '',
    notesGerencia: '', ultimaActualizacion: today()
  };
  
  leads.unshift(l);
  save();
  closePanel(null);
  renderDashboard();
  notify('✅ Lead #' + l.id + ' creado');
}

// ─── PANEL CLOSE ─────────────────────────────────────────────────────────────
function closePanel(e) {
  if (e && e.target !== document.getElementById('overlay')) return;
  document.getElementById('overlay').classList.remove('open');
}

// ─── EXPORT CSV ──────────────────────────────────────────────────────────────
function exportCSV() {
  const cols = ['ID', 'Fecha Ingreso', 'Nombre', 'Empresa', 'Teléfono', 'Correo', 'Ciudad', 'Estado Geo', 'País', 'Fuente', 'Productos', 'Presupuesto', 'Responsable', 'Ejecutivo', 'Estado Lead', 'Prioridad', 'Próximo Seguimiento', 'Fecha Cierre', 'Monto Potencial', 'Monto Cerrado', 'Notas Ventas', 'Notas Gerencia', 'Última Actualización'];
  const rows = leads.map(l => [l.id, l.fechaIngreso, l.nombre, l.empresa, l.telefono, l.correo, l.ciudad, l.estado_geo, l.pais, l.fuente, l.producto.join(';'), l.presupuesto, l.responsable, l.ejecutivo, l.estadoLead, l.prioridad, l.proximoSeg, l.fechaCierre, l.montoPotencial, l.montoCerrado, l.notesVentas || l.notasVentas, l.notasGerencia, l.ultimaActualizacion].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`));
  const csv = [cols.map(c => `"${c}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'leads_herbolaria_' + today() + '.csv' });
  a.click(); URL.revokeObjectURL(a.href);
  notify('📥 CSV exportado: ' + leads.length + ' leads');
}

// ─── SECCIÓN DE CONFIGURACIONES (CATÁLOGOS EDITABLES) ─────────────────────────
function renderConfig() {
  document.getElementById('tab-config').innerHTML = `
    <div class="config-container">
      <h2><i class="ti ti-settings"></i> Panel de Configuración de Catálogos</h2>
      <p style="color:var(--text2); margin-bottom:12px;">Modifica los elementos disponibles en los menús desplegables comerciales de tu CRM. Toda adición o remoción requiere tu contraseña.</p>
      
      <div class="config-box">
        <h3><i class="ti ti-antenna-bars-5"></i> Fuente</h3>
        <div class="config-tags-wrapper">${FUENTES.map((f, i) => `<div class="config-tag">${f}<span onclick="removeConfigItem('fuente', ${i})">×</span></div>`).join('')}</div>
        <div class="config-input-group">
          <input type="text" id="add-fuente" placeholder="Nueva Fuente...">
          <button class="btn btn-primary" onclick="addConfigItem('fuente')">Agregar</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-leaf"></i> Producto de interés</h3>
        <div class="config-tags-wrapper">${PRODUCTOS.map((p, i) => `<div class="config-tag">${p}<span onclick="removeConfigItem('producto', ${i})">×</span></div>`).join('')}</div>
        <div class="config-input-group">
          <input type="text" id="add-producto" placeholder="Nuevo Producto...">
          <button class="btn btn-primary" onclick="addConfigItem('producto')">Agregar</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-currency-dollar"></i> Presupuesto estimado</h3>
        <div class="config-tags-wrapper">${PRESUPUESTOS.map((p, i) => `<div class="config-tag">${p}<span onclick="removeConfigItem('presupuesto', ${i})">×</span></div>`).join('')}</div>
        <div class="config-input-group">
          <input type="text" id="add-presupuesto" placeholder="Nuevo Rango de Presupuesto...">
          <button class="btn btn-primary" onclick="addConfigItem('presupuesto')">Agregar</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-users"></i> Responsable comercial</h3>
        <div class="config-tags-wrapper">${RESPONSABLES.map((r, i) => `<div class="config-tag">${r}<span onclick="removeConfigItem('responsable', ${i})">×</span></div>`).join('')}</div>
        <div class="config-input-group">
          <input type="text" id="add-responsable" placeholder="Nuevo Área/Responsable...">
          <button class="btn btn-primary" onclick="addConfigItem('responsable')">Agregar</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-user-tie"></i> Ejecutivo asignado</h3>
        <div class="config-tags-wrapper">${EJECUTIVOS.map((e, i) => `<div class="config-tag">${e}<span onclick="removeConfigItem('ejecutivo', ${i})">×</span></div>`).join('')}</div>
        <div class="config-input-group">
          <input type="text" id="add-ejecutivo" placeholder="Nuevo Ejecutivo...">
          <button class="btn btn-primary" onclick="addConfigItem('ejecutivo')">Agregar</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-shield-lock"></i> Administradores Alternos</h3>
        <p style="font-size:11px; color:var(--text3); margin-bottom:8px;">Usuario principal "${AUTH_USER}" no editable por motivos de seguridad.</p>
        <div class="config-tags-wrapper">
          ${ADMINS.map((admin, i) => `
            <div class="config-tag" style="background:var(--bg2); border:1px solid #185fa5; display: inline-flex; align-items: center; gap: 4px;">
              <i class="ti ti-user" style="font-size:11px;"></i> ${admin.user}
              <i class="ti ti-edit" style="font-size:11px; cursor:pointer; color:var(--green); margin-left:4px;" onclick="setupEditAdmin(${i})" title="Configurar / Editar cuenta"></i>
              <span onclick="removeAdminUser(${i})" title="Eliminar">×</span>
            </div>
          `).join('')}
          ${ADMINS.length === 0 ? '<span style="font-size:12px; color:var(--text3); font-style:italic">No hay administradores adicionales</span>' : ''}
        </div>
        <div class="config-input-group" style="display:flex; gap:8px; margin-top:8px; flex-wrap:wrap;">
          <input type="text" id="add-admin-user" placeholder="Usuario..." style="flex:1; min-width:120px;">
          <input type="password" id="add-admin-pass" placeholder="Contraseña..." style="flex:1; min-width:120px;">
          <button class="btn btn-primary" id="btn-admin-submit" onclick="addAdminUser()">Agregar Admin</button>
          <button class="btn" id="btn-admin-cancel" onclick="cancelAdminEdit()" style="display:none; background:var(--bg3)">Cancelar</button>
        </div>
      </div>

    </div>
  `;
}

function addConfigItem(type) {
  const inputEl = document.getElementById(`add-${type}`);
  const val = inputEl?.value.trim();
  if (!val) return;

  if (!checkPasswordPrompt(`Agregar el elemento "${val}" al catálogo de ${type}`)) return;

  if (type === 'fuente') FUENTES.push(val);
  else if (type === 'producto') PRODUCTOS.push(val);
  else if (type === 'presupuesto') PRESUPUESTOS.push(val);
  else if (type === 'responsable') RESPONSABLES.push(val);
  else if (type === 'ejecutivo') EJECUTIVOS.push(val);

  saveConfigStorage();
  renderConfig();
  notify('✨ Catálogo actualizado con éxito');
}

function removeConfigItem(type, index) {
  if (!checkPasswordPrompt(`Eliminar este elemento del catálogo de ${type}`)) return;

  if (type === 'fuente') FUENTES.splice(index, 1);
  else if (type === 'producto') PRODUCTOS.splice(index, 1);
  else if (type === 'presupuesto') PRESUPUESTOS.splice(index, 1);
  else if (type === 'responsable') RESPONSABLES.splice(index, 1);
  else if (type === 'ejecutivo') EJECUTIVOS.splice(index, 1);

  saveConfigStorage();
  renderConfig();
  notify('🗑 Elemento removido del catálogo');
}

// ─── ACCIONES DE ADMINISTRACIÓN DE USUARIOS ──────────────────────────────────
function setupEditAdmin(index) {
  const admin = ADMINS[index];
  if (!admin) return;

  editingAdminIndex = index;
  
  document.getElementById('add-admin-user').value = admin.user;
  document.getElementById('add-admin-pass').value = admin.pass;
  
  const btnSubmit = document.getElementById('btn-admin-submit');
  btnSubmit.textContent = "Actualizar Config.";
  btnSubmit.setAttribute("onclick", "updateAdminUser()");
  
  document.getElementById('btn-admin-cancel').style.display = "inline-block";
}

function cancelAdminEdit() {
  editingAdminIndex = null;
  renderConfig();
}

function addAdminUser() {
  const userEl = document.getElementById('add-admin-user');
  const passEl = document.getElementById('add-admin-pass');
  const userVal = userEl?.value.trim();
  const passVal = passEl?.value;

  if (!userVal || !passVal) {
    alert('Por favor ingresa tanto el usuario como la contraseña.');
    return;
  }

  if (userVal.toLowerCase() === AUTH_USER.toLowerCase()) {
    alert('❌ No puedes utilizar el nombre del administrador maestro.');
    return;
  }

  if (ADMINS.some(admin => admin.user.toLowerCase() === userVal.toLowerCase())) {
    alert('❌ Este usuario administrador ya existe.');
    return;
  }

  if (!checkPasswordPrompt(`Agregar al nuevo administrador "${userVal}"`)) return;

  ADMINS.push({ user: userVal, pass: passVal });
  
  saveConfigStorage();
  renderConfig();
  notify('✨ Nuevo administrador registrado con éxito');
}

function updateAdminUser() {
  if (editingAdminIndex === null) return;

  const userEl = document.getElementById('add-admin-user');
  const passEl = document.getElementById('add-admin-pass');
  const userVal = userEl?.value.trim();
  const passVal = passEl?.value;

  if (!userVal || !passVal) {
    alert('El usuario y la contraseña no pueden estar vacíos.');
    return;
  }

  if (userVal.toLowerCase() === AUTH_USER.toLowerCase()) {
    alert('❌ No puedes utilizar el nombre del administrador maestro.');
    return;
  }

  const existeDuplicado = ADMINS.some((admin, i) => i !== editingAdminIndex && admin.user.toLowerCase() === userVal.toLowerCase());
  if (existeDuplicado) {
    alert('❌ Otro administrador ya está usando ese nombre de usuario.');
    return;
  }

  if (!checkPasswordPrompt(`Modificar la configuración del usuario "${ADMINS[editingAdminIndex].user}"`)) return;

  ADMINS[editingAdminIndex] = { user: userVal, pass: passVal };
  editingAdminIndex = null;

  saveConfigStorage();
  renderConfig();
  notify('🔄 Cuenta de administrador modificada correctamente');
}

function removeAdminUser(index) {
  const adminTarget = ADMINS[index];
  if (!adminTarget) return;

  if (!checkPasswordPrompt(`Eliminar permanentemente los accesos de "${adminTarget.user}"`)) return;

  ADMINS.splice(index, 1);
  if (editingAdminIndex === index) editingAdminIndex = null;

  saveConfigStorage();
  renderConfig();
  notify('🗑 Administrador eliminado del sistema');
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.onload = function() {
  if (sessionStorage.getItem('crm_logged_in') === 'true') {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    renderDashboard();
    verificarRespaldoMensual();
  } else {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('main-layout').style.display = 'none';
  }
}