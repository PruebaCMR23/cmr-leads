// ─── CONFIGURACIÓN DE CONEXIÓN CON SUPABASE ───────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

let AUTH_USER = "Herbolaria";
let AUTH_PASS = "Saludable*"; 

let ADMINS = [];
let FUENTES = [];
let PRODUCTOS = [];
let PRESUPUESTOS = [];
let RESPONSABLES = [];
let EJECUTIVOS = [];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];
const ESTADOS = ['Nuevo', 'Contactado', 'Calificado', 'Propuesta Enviada', 'En Negociación', 'Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'];

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
    "Prefer": method === 'POST' ? "return=representation" : ""
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

// ─── CARGA Y FLUJO GLOBAL DE CATÁLOGOS NUBE ───────────────────────────────────
async function cargarConfiguracionesBase() {
  document.getElementById('cfg-main-user').value = AUTH_USER;

  const fData = await supabaseRequest('config_fuentes?select=*');
  FUENTES = fData ? fData.map(x => x.nombre) : [];
  
  const pData = await supabaseRequest('config_productos?select=*');
  PRODUCTOS = pData ? pData.map(x => x.nombre) : [];

  const prData = await supabaseRequest('config_presupuestos?select=*');
  PRESUPUESTOS = prData ? prData.map(x => x.nombre) : [];

  const rData = await supabaseRequest('config_responsables?select=*');
  RESPONSABLES = rData ? rData.map(x => x.nombre) : [];

  const eData = await supabaseRequest('config_ejecutives?select=*');
  EJECUTIVOS = eData ? eData.map(x => x.nombre) : [];

  const aData = await supabaseRequest('config_admins?select=*');
  ADMINS = aData || [];

  actualizarSelectsFiltrosTodosLeads();
  renderConfiguracionPanel();
}

async function fetchLeads() {
  const data = await supabaseRequest('crm_leads?select=*&order=id.desc');
  LEADS = data || [];
  renderDashboard();
  renderTodosLosLeads(LEADS);
  renderSeguimientoCategorias();
  renderReportesPestana();
  revisarSeguimientosHoy(LEADS);
}

// ─── CONTROL DE LOGIN Y ACCESOS ───────────────────────────────────────────────
function handleLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  const errorDiv = document.getElementById('login-error');

  const adminValido = ADMINS.find(a => a.user === user && a.pass === pass);

  if ((user === AUTH_USER && pass === AUTH_PASS) || adminValido) {
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
  inyectarOpcionesFiltro('f-estado', ESTADOS, 'Todos los estados');
  inyectarOpcionesFiltro('f-responsable', RESPONSABLES, 'Todos los responsables');
  inyectarOpcionesFiltro('f-prioridad', PRIORIDADES, 'Todas las prioridades');
}

function inyectarOpcionesFiltro(elementId, arrayData, placeholder) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let html = `<option value="">${placeholder}</option>`;
  arrayData.forEach(v => { html += `<option value="${v}">${v}</option>`; });
  el.innerHTML = html;
}

function filtrarTodosLosLeads() {
  const search = document.getElementById('f-search').value.toLowerCase();
  const fuente = document.getElementById('f-fuente').value;
  const estado = document.getElementById('f-estado').value;
  const resp = document.getElementById('f-responsable').value;
  const prio = document.getElementById('f-prioridad').value;

  const filtrados = LEADS.filter(l => {
    const cumpleSearch = !search || 
      (l.nombre && l.nombre.toLowerCase().includes(search)) ||
      (l.empresa && l.empresa.toLowerCase().includes(search)) ||
      (l.telefono && l.telefono.includes(search));
    const cumpleFuente = !fuente || l.fuente === fuente;
    const cumpleEstado = !estado || l.estado === estado;
    const cumpleResp = !resp || (l.responsable && l.responsable.includes(resp));
    const cumplePrio = !prio || l.prioridad === prio;

    return cumpleSearch && cumpleFuente && cumpleEstado && cumpleResp && cumplePrio;
  });

  renderTodosLosLeads(filtrados);
}

function renderTodosLosLeads(arreglo) {
  const tbody = document.getElementById('leads-table-body');
  if (!tbody) return;

  if (arreglo.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="no-data-row">No hay datos aún</td></tr>`;
    return;
  }

  let html = '';
  arreglo.forEach(l => {
    const fStr = l.proximoseg ? new Date(l.proximoseg).toLocaleString('es-MX').substring(0, 16) : '—';
    const fIngreso = l.created_at ? new Date(l.created_at).toLocaleDateString('es-MX') : '—';
    html += `
      <tr style="cursor:pointer;" onclick="togglePanel(true, ${l.id})">
        <td><strong>#${l.id}</strong></td>
        <td>${fIngreso}</td>
        <td><strong>${l.nombre}</strong>${l.empresa ? `<br><small style="color:var(--text2);">${l.empresa}</small>` : ''}</td>
        <td>${l.telefono || ''}${l.correo ? `<br><small style="color:var(--text2);">${l.correo}</small>` : ''}</td>
        <td>${l.fuente || '—'}</td>
        <td>${l.producto || '—'}</td>
        <td>${l.responsable ? l.responsable.split(' - ')[0] : '—'}</td>
        <td><span class="tab" style="padding:2px 8px; font-size:11px; display:inline; background:var(--bg2);">${l.estado}</span></td>
        <td>${l.prioridad || 'Media'}</td>
        <td>${fStr}</td>
        <td><strong>${l.presupuesto || '$0'}</strong></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// ─── PESTAÑA: SEGUIMIENTO ─────────────────────────────────────────────────────
function renderSeguimientoCategorias() {
  const tVencidos = document.getElementById('table-vencidos');
  const tHoy = document.getElementById('table-hoy');
  const tFuturos = document.getElementById('table-futuros');

  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const limiteFuturo = new Date(hoy);
  limiteFuturo.setDate(limiteFuturo.getDate() + 15);

  const vencidosArr = [];
  const hoyArr = [];
  const futurosArr = [];

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

  inyectarFilasSeguimiento(tVencidos, vencidosArr);
  inyectarFilasSeguimiento(tHoy, hoyArr);
  inyectarFilasSeguimiento(tFuturos, futurosArr);
}

function inyectarFilasSeguimiento(tbody, arreglo) {
  if (!tbody) return;
  if (arreglo.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="no-data-row">Sin leads en esta categoría ✓</td></tr>`;
    return;
  }
  let html = '';
  arreglo.forEach(l => {
    const fStr = new Date(l.proximoseg).toLocaleString('es-MX').substring(0, 16);
    html += `
      <tr style="cursor:pointer;" onclick="togglePanel(true, ${l.id})">
        <td><strong>#${l.id}</strong></td>
        <td>${l.nombre}</td>
        <td>${l.fuente}</td>
        <td>${l.estado}</td>
        <td>${l.responsable ? l.responsable.split(' - ')[0] : ''}</td>
        <td><i class="ti ti-alarm" style="color:#f59e0b;"></i> ${fStr}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// ─── PESTAÑA: REPORTES (MÉTRICAS HORIZONTALES Y 3 GRÁFICOS COMPLETOS) ─────────
function renderReportesPestana() {
  const hoy = new Date();
  const esteMes = hoy.getMonth();
  const esteAno = hoy.getFullYear();

  const leadsMes = LEADS.filter(l => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    return d.getMonth() === esteMes && d.getFullYear() === esteAno;
  }).length;

  const ganados = LEADS.filter(l => l.estado === 'Cerrado Ganado');
  const conversion = LEADS.length > 0 ? Math.round((ganados.length / LEADS.length) * 100) : 0;

  let totalVendido = 0;
  ganados.forEach(g => { totalVendido += extraerNumeroMonto(g.presupuesto); });
  const promedio = ganados.length > 0 ? Math.round(totalVendido / ganados.length) : 0;

  document.getElementById('r-mensual').textContent = leadsMes;
  document.getElementById('r-conversion').textContent = `${conversion}%`;
  document.getElementById('r-promedio').textContent = `$${promedio.toLocaleString('es-MX')}`;
  document.getElementById('r-total').textContent = `$${totalVendido.toLocaleString('es-MX')}`;

  // Agrupar leads por mes
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const conteoMeses = {};
  LEADS.forEach(l => {
    if (l.created_at) {
      const m = new Date(l.created_at).getMonth();
      conteoMeses[mesesNombres[m]] = (conteoMeses[mesesNombres[m]] || 0) + 1;
    }
  });
  construirBarrasGrafica('chart-rep-mes', Object.entries(conteoMeses));

  // Ventas por Canal (Cerrados Ganados agrupados por fuente)
  const conteoCanal = {};
  ganados.forEach(g => {
    conteoCanal[g.fuente || 'Por definir'] = (conteoCanal[g.fuente || 'Por definir'] || 0) + 1;
  });
  construirBarrasGrafica('chart-rep-canal', Object.entries(conteoCanal));

  // Cierres por Responsable
  const conteoResp = {};
  ganados.forEach(g => {
    const nombreResp = g.responsable ? g.responsable.split(' - ')[0] : 'Por definir';
    conteoResp[nombreResp] = (conteoResp[nombreResp] || 0) + 1;
  });
  construirBarrasGrafica('chart-rep-responsable', Object.entries(conteoResp));
}

// ─── PESTAÑA: CONFIGURACIÓN COMPLETA REESTABLECIDA ───────────────────────────
function renderConfiguracionPanel() {
  inyectarTagsConfig('cfg-wrap-fuente', FUENTES, 'config_fuentes');
  inyectarTagsConfig('cfg-wrap-producto', PRODUCTOS, 'config_productos');
  inyectarTagsConfig('cfg-wrap-presupuesto', PRESUPUESTOS, 'config_presupuestos');
  inyectarTagsConfig('cfg-wrap-responsable', RESPONSABLES, 'config_responsables');
  inyectarTagsConfig('cfg-wrap-ejecutivo', EJECUTIVOS, 'config_ejecutives');

  const tbody = document.getElementById('cfg-table-admins');
  if (!tbody) return;
  let html = '';
  ADMINS.forEach(a => {
    html += `
      <tr>
        <td>${a.user}</td>
        <td>••••••••</td>
        <td><button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="eliminarAdminUser(${a.id})"><i class="ti ti-trash"></i></button></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function inyectarTagsConfig(contenedorId, datos, tablaNube) {
  const container = document.getElementById(contenedorId);
  if (!container) return;
  let html = '';
  datos.forEach(val => {
    html += `
      <div class="config-tag">
        ${val}
        <span onclick="eliminarConfigTag('${tablaNube}', '${val}')">&times;</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function agregarConfigTag(tipo) {
  const input = document.getElementById(`cfg-in-${tipo}`);
  const valor = input ? input.value.trim() : '';
  if (!valor) return;

  let tabla = `config_${tipo}s`;
  if (tipo === 'ejecutivo') tabla = 'config_ejecutives';

  const res = await supabaseRequest(tabla, 'POST', { nombre: valor });
  if (res) {
    notify(`✅ Elemento agregado a ${tipo}`);
    input.value = '';
    await cargarConfiguracionesBase();
  }
}

async function eliminarConfigTag(tabla, nombre) {
  if (!confirm(`¿Eliminar "${nombre}" de las opciones?`)) return;
  const res = await supabaseRequest(`${tabla}?nombre=eq.${encodeURIComponent(nombre)}`, 'DELETE');
  if (res) {
    notify(`🗑 Elemento eliminado`);
    await cargarConfiguracionesBase();
  }
}

async function actualizarPasswordPrincipal() {
  const nPass = document.getElementById('cfg-main-pass').value.trim();
  if (!nPass) return;
  AUTH_PASS = nPass;
  notify("🔒 Contraseña principal actualizada para esta sesión.");
  document.getElementById('cfg-main-pass').value = '';
}

async function agregarAdminUser() {
  const u = document.getElementById('cfg-add-user').value.trim();
  const p = document.getElementById('cfg-add-pass').value.trim();
  if (!u || !p) return;

  const res = await supabaseRequest('config_admins', 'POST', { user: u, pass: p });
  if (res) {
    notify("👤 Cuenta adicional creada.");
    document.getElementById('cfg-add-user').value = '';
    document.getElementById('cfg-add-pass').value = '';
    await cargarConfiguracionesBase();
  }
}

async function eliminarAdminUser(id) {
  if (!confirm("¿Eliminar este usuario administrador?")) return;
  const res = await supabaseRequest(`config_admins?id=eq.${id}`, 'DELETE');
  if (res) {
    notify("🗑 Cuenta eliminada.");
    await cargarConfiguracionesBase();
  }
}

// ─── RENDERIZADO GENERAL DASHBOARD ───────────────────────────────────────────
function renderDashboard() {
  const total = LEADS.length;
  const ganados = LEADS.filter(l => l.estado === 'Cerrado Ganado').length;
  const perdidos = LEADS.filter(l => l.estado === 'Cerrado Perdido').length;
  const abandonados = LEADS.filter(l => l.estado === 'Abandonado').length;
  const tasa = total > 0 ? Math.round((ganados / total) * 100) : 0;
  
  const hoy = new Date();
  const vencidos = LEADS.filter(l => {
    if (!l.proximoseg || ['Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'].includes(l.estado)) return false;
    return new Date(l.proximoseg) < hoy;
  }).length;

  let montoCerradoTotal = 0;
  let pipelinePotencialTotal = 0;

  LEADS.forEach(l => {
    const valor = extraerNumeroMonto(l.presupuesto);
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
  document.getElementById('m-vencidos').textContent = vencidos;
  document.getElementById('m-abandonados').textContent = abandonados;
  document.getElementById('m-perdidos').textContent = perdidos;

  construirBarrasGrafica('chart-fuente', agruparPorClave(LEADS, 'fuente'));
  construirBarrasGrafica('chart-estado', agruparPorClave(LEADS, 'estado'));
  construirBarrasGrafica('chart-responsable', agruparPorClave(LEADS, 'responsable'));
  construirBarrasGrafica('chart-producto', agruparPorClave(LEADS, 'producto'));

  renderTablaSeguimientoActivos();
}

function extraerNumeroMonto(str) {
  if (!str) return 0;
  const nums = str.replace(/[^0-9]/g, '');
  if(!nums) return 0;
  if(str.includes('-')) {
    const partes = str.split('-');
    return parseInt(partes[0].replace(/[^0-9]/g, '')) || 0;
  }
  return parseInt(nums) || 0;
}

function agruparPorClave(leads, clave) {
  const conteo = {};
  leads.forEach(l => {
    let valor = l[clave] || 'Por definir';
    if(clave === 'responsable' && valor.includes(' - ')) valor = valor.split(' - ')[0];
    conteo[valor] = (conteo[valor] || 0) + 1;
  });
  return Object.entries(conteo).sort((a, b) => b[1] - a[1]);
}

function construirBarrasGrafica(elementId, dataset) {
  const contenedor = document.getElementById(elementId);
  if (!contenedor) return;
  if (dataset.length === 0) {
    contenedor.innerHTML = `<div class="no-records">Sin registros</div>`;
    return;
  }
  const maxVal = Math.max(...dataset.map(x => x[1]));
  let html = '';
  dataset.forEach((item, index) => {
    const porcentaje = maxVal > 0 ? (item[1] / maxVal) * 100 : 0;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    html += `
      <div class="custom-bar-row">
        <div class="custom-bar-info"><span>${item[0]}</span><span>${item[1]}</span></div>
        <div class="custom-bar-bg"><div class="custom-bar-fill" style="width: ${porcentaje}%; background-color: ${color};"></div></div>
      </div>
    `;
  });
  contenedor.innerHTML = html;
}

function renderTablaSeguimientoActivos() {
  const tbody = document.getElementById('dashboard-table-body');
  if (!tbody) return;
  const activos = LEADS.filter(l => l.proximoseg && !['Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'].includes(l.estado));
  if (activos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="no-data-row">No hay seguimientos agendados</td></tr>`;
    return;
  }
  let html = '';
  activos.forEach(l => {
    const fStr = new Date(l.proximoseg).toLocaleString('es-MX').substring(0, 16);
    html += `
      <tr style="cursor:pointer;" onclick="togglePanel(true, ${l.id})">
        <td><strong>#${l.id}</strong></td>
        <td>${l.nombre}</td>
        <td><span class="tab" style="padding:2px 8px; font-size:11px; display:inline; background:var(--bg2);">${l.estado}</span></td>
        <td>${l.responsable ? l.responsable.split(' - ')[0] : ''}</td>
        <td><i class="ti ti-alarm" style="color:#f59e0b;"></i> ${fStr}</td>
        <td><strong>${l.presupuesto || '$0'}</strong></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// ─── CONTROL DEL DRAWER / PANEL LATERAL FLOTANTE ─────────────────────────────
function togglePanel(show, leadId = null) {
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('panel');
  if (!overlay || !panel) return;

  if (show) {
    llenarSelectsFormulario();
    if (leadId) {
      currentLeadId = leadId;
      document.getElementById('panel-title').innerHTML = `<i class="ti ti-edit"></i> Editar Lead #${leadId}`;
      document.getElementById('btn-delete-lead').style.display = 'block';
      cargarLeadEnCampos(leadId);
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

function closePanel(e) { if (e && e.target.id === 'overlay') togglePanel(false); }

function llenarSelectsFormulario() {
  inyectarOpciones('n-fuente', FUENTES, 'Seleccionar fuente...');
  inyectarOpciones('n-producto', PRODUCTOS, 'Seleccionar producto...');
  inyectarOpciones('n-presupuesto', PRESUPUESTOS, 'Seleccionar monto...');
  inyectarOpciones('n-responsable', EJECUTIVOS, 'Seleccionar responsable...');
  inyectarOpciones('n-prioridad', PRIORIDADES);
  inyectarOpciones('n-situacion', ESTADOS);
}

function inyectarOpciones(elementId, arrayData, placeholder = null) {
  const el = document.getElementById(elementId);
  if (!el) return;
  let html = placeholder ? `<option value="" disabled selected>${placeholder}</option>` : '';
  arrayData.forEach(v => { html += `<option value="${v}">${v}</option>`; });
  el.innerHTML = html;
}

function limpiarCamposFormulario() {
  ['n-nombre', 'n-empresa', 'n-telefono', 'n-correo', 'n-ciudad', 'n-estado', 'n-seg', 'n-notas'].forEach(id => {
    const field = document.getElementById(id); if (field) field.value = '';
  });
  ['n-fuente', 'n-producto', 'n-presupuesto', 'n-responsable', 'n-prioridad', 'n-situacion'].forEach(id => {
    const field = document.getElementById(id); if (field) field.selectedIndex = 0;
  });
}

function cargarLeadEnCampos(id) {
  const lead = LEADS.find(l => l.id == id);
  if (!lead) return;
  document.getElementById('n-nombre').value = lead.nombre || '';
  document.getElementById('n-empresa').value = lead.empresa || '';
  document.getElementById('n-telefono').value = lead.telefono || '';
  document.getElementById('n-correo').value = lead.correo || '';
  document.getElementById('n-ciudad').value = lead.ciudad || '';
  document.getElementById('n-estado').value = lead.estado_rep || '';
  document.getElementById('n-fuente').value = lead.fuente || '';
  document.getElementById('n-producto').value = lead.producto || '';
  document.getElementById('n-presupuesto').value = lead.presupuesto || '';
  document.getElementById('n-responsable').value = lead.responsable || '';
  document.getElementById('n-prioridad').value = lead.prioridad || 'Media';
  document.getElementById('n-situacion').value = lead.estado || 'Nuevo';
  document.getElementById('n-seg').value = lead.proximoseg ? lead.proximoseg.substring(0, 16) : '';
  document.getElementById('n-notas').value = lead.notas || '';
}

async function guardarLeadFormulario() {
  const nombre = document.getElementById('n-nombre').value.trim();
  const fuente = document.getElementById('n-fuente').value;
  const producto = document.getElementById('n-producto').value;
  const responsable = document.getElementById('n-responsable').value;

  if (!nombre || !fuente || !producto || !responsable) {
    alert("⚠️ Por favor rellena los campos marcados como obligatorios (*)");
    return;
  }

  const payload = {
    nombre,
    empresa: document.getElementById('n-empresa').value.trim(),
    telefono: document.getElementById('n-telefono').value.trim(),
    correo: document.getElementById('n-correo').value.trim(),
    ciudad: document.getElementById('n-ciudad').value.trim(),
    estado_rep: document.getElementById('n-estado').value.trim(),
    fuente,
    producto,
    presupuesto: document.getElementById('n-presupuesto').value,
    responsable,
    prioridad: document.getElementById('n-prioridad').value || 'Media',
    estado: document.getElementById('n-situacion').value || 'Nuevo',
    proximoseg: document.getElementById('n-seg').value ? new Date(document.getElementById('n-seg').value).toISOString() : null,
    notas: document.getElementById('n-notas').value.trim()
  };

  if (currentLeadId) {
    const res = await supabaseRequest(`crm_leads?id=eq.${currentLeadId}`, 'PATCH', payload);
    if (res) notify("🔄 Prospecto actualizado correctamente.");
  } else {
    const res = await supabaseRequest('crm_leads', 'POST', payload);
    if (res) notify("🚀 Nuevo lead registrado exitosamente.");
  }
  togglePanel(false);
  fetchLeads();
}

async function eliminarLeadActual() {
  if (!currentLeadId) return;
  if (!confirm("⚠️ ¿Estás seguro de eliminar este Prospecto?")) return;
  const res = await supabaseRequest(`crm_leads?id=eq.${currentLeadId}`, 'DELETE');
  if (res) notify("🗑 Registro eliminado.");
  togglePanel(false);
  fetchLeads();
}

function switchTab(target, tabElement) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabElement.classList.add('active');
  ['tab-dashboard', 'tab-leads', 'tab-seguimiento', 'tab-reportes', 'tab-config'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  const activeView = document.getElementById(`tab-${target}`);
  if (activeView) activeView.style.display = 'block';
}

function notify(msg) {
  const toast = document.getElementById('notif-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function revisarSeguimientosHoy(leads) {
  const hoyStr = new Date().toLocaleDateString('es-MX');
  const hoyLeads = leads ? leads.filter(l => {
    if (!l.proximoseg) return false;
    return new Date(l.proximoseg).toLocaleDateString('es-MX') === hoyStr && !['Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'].includes(l.estado);
  }) : [];
  if (hoyLeads.length > 0) {
    setTimeout(() => { alert(`📢 ¡Recordatorio!\nTienes (${hoyLeads.length}) seguimientos agendados para hoy.`); }, 1000);
  }
}

function exportCSV() {
  if (LEADS.length === 0) return;
  let csv = "ID,Nombre,Empresa,Telefono,Correo,Ciudad,EstadoRep,Fuente,Producto,Presupuesto,Responsable,Prioridad,EstadoPipeline,ProximoSeg\n";
  LEADS.forEach(l => {
    csv += `"${l.id}","${l.nombre}","${l.empresa || ''}","${l.telefono || ''}","${l.correo || ''}","${l.ciudad || ''}","${l.estado_rep || ''}","${l.fuente}","${l.producto}","${l.presupuesto}","${l.responsable}","${l.prioridad}","${l.estado}","${l.proximoseg || ''}"\n`;
  });
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `Leads_Herbolaria_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function inicializarSistema() {
  await cargarConfiguracionesBase();
  await fetchLeads();
}

window.onload = function() {
  // Carga previa de administradores de seguridad obligatorios
  supabaseRequest('config_admins?select=*').then(data => {
    ADMINS = data || [];
    if (sessionStorage.getItem('crm_logged_in') === 'true') {
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('main-layout').style.display = 'block';
      inicializarSistema();
    }
  });
};
