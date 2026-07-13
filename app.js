// ─── CONFIGURACIÓN DE CONEXIÓN CON SUPABASE ───────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

let supabaseClient = null;

let AUTH_USER = "Herbolaria";
let AUTH_PASS = "Saludable*"; 

let ADMINS = [];
let FUENTES = [];
let PRODUCTOS = [];
let PRESUPUESTOS = [];
let ESTADOS_PIPELINE = [];

const RESPONSABLES = [
  'Pilar Gonzalez - marketing digital',
  'Ana Maria Alonso - Ventas Online',
  'Yessica Carrillo - Gerencia de Ventas (Ventas Mayoreo)',
  'Emmanuel Zúñiga - Gerencia General'
];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

let LEADS = [];
let currentLeadId = null;

// Inicialización e intento de Carga Inicial Segura
document.addEventListener("DOMContentLoaded", async () => {
  if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    await cargarConfiguracionDesdeSupabase();
  } else {
    console.error("Supabase CDN no está disponible en este momento.");
  }
});

async function cargarConfiguracionDesdeSupabase() {
  if (!supabaseClient) return;
  try {
    const { data: configData, error } = await supabaseClient.from('crm_config').select('*');
    if (error) throw error;

    ADMINS = configData.filter(c => c.tipo === 'admin');
    FUENTES = configData.filter(c => c.tipo === 'fuente').map(c => c.valor);
    PRODUCTOS = configData.filter(c => c.tipo === 'producto').map(c => c.valor);
    PRESUPUESTOS = configData.filter(c => c.tipo === 'presupuesto').map(c => c.valor);
    ESTADOS_PIPELINE = configData.filter(c => c.tipo === 'estado').map(c => c.valor);

    const mainAcc = ADMINS.find(a => a.valor === 'Herbolaria');
    if (mainAcc) {
      AUTH_PASS = mainAcc.extra || "Saludable*";
    }

    actualizarTodosLosSelectsFormulario();
    renderConfigTags();
    renderAdminUsersTable();
  } catch (err) {
    console.error("Error cargando configuración inicial:", err.message);
  }
}

// MANEJO DE LOGIN / ACCESO SIMPLE
async function handleLogin() {
  const userIn = document.getElementById("login-user").value.trim();
  const passIn = document.getElementById("login-pass").value.trim();
  const errDiv = document.getElementById("login-error");

  let loginValido = false;

  if (userIn === AUTH_USER && passIn === AUTH_PASS) {
    loginValido = true;
  } else {
    const cuentaAdicional = ADMINS.find(a => a.valor === userIn && a.extra === passIn);
    if (cuentaAdicional) loginValido = true;
  }

  if (loginValido) {
    document.getElementById("login-container").style.display = "none";
    document.getElementById("main-layout").style.display = "flex";
    showToast("¡Acceso correcto! Cargando datos...");
    await fetchLeadsDesdeSupabase();
  } else {
    errDiv.innerText = "Usuario o contraseña incorrectos.";
    errDiv.style.display = "block";
  }
}

function handleLogout() {
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
  document.getElementById("main-layout").style.display = "none";
  document.getElementById("login-container").style.display = "flex";
  if(document.getElementById("login-error")) document.getElementById("login-error").style.display = "none";
}

// CARGA DE LEADS DESDE SUPABASE
async function fetchLeadsDesdeSupabase() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('crm_leads')
      .select('*')
      .order('fechacreacion', { ascending: false })

    if (error) throw error;
    LEADS = data || [];
    
    procesarDashboardMétricasYGráficos();
    renderTodosLosLeadsTabla();
    renderPestañaSeguimiento();
    procesarReportesAvanzados();
    evaluarRecordatoriosHoy(LEADS);
  } catch (err) {
    showToast("Error al sincronizar leads: " + err.message);
  }
}

// NAVEGACIÓN ENTRE PESTAÑAS
function switchTab(tabId, el) {
  const tabs = ['dashboard', 'leads', 'seguimiento', 'reportes', 'config'];
  tabs.forEach(t => {
    const target = document.getElementById(`tab-${t}`);
    if (target) target.style.display = (t === tabId) ? 'block' : 'none';
  });

  const allTabsDOM = document.querySelectorAll(".tabs .tab");
  allTabsDOM.forEach(t => t.classList.remove("active"));
  if (el) el.classList.add("active");

  if (tabId === 'dashboard') procesarDashboardMétricasYGráficos();
  if (tabId === 'leads') renderTodosLosLeadsTabla();
  if (tabId === 'seguimiento') renderPestañaSeguimiento();
  if (tabId === 'reportes') procesarReportesAvanzados();
  if (tabId === 'config') {
    document.getElementById("cfg-main-user").value = AUTH_USER;
    renderConfigTags();
    renderAdminUsersTable();
  }
}

// SELECTS ACTUALIZACIÓN
function actualizarTodosLosSelectsFormulario() {
  rellenarSelect("n-fuente", FUENTES);
  rellenarSelect("n-producto", PRODUCTOS);
  rellenarSelect("n-presupuesto", PRESUPUESTOS);
  rellenarSelect("n-responsable", RESPONSABLES);
  rellenarSelect("n-prioridad", PRIORIDADES);
  rellenarSelect("n-situacion", ESTADOS_PIPELINE);

  rellenarSelectFiltro("f-fuente", FUENTES, "Todas las fuentes");
  rellenarSelectFiltro("f-estado", ESTADOS_PIPELINE, "Todos los estados");
  rellenarSelectFiltro("f-responsable", RESPONSABLES, "Todos los responsables");
  rellenarSelectFiltro("f-prioridad", PRIORIDADES, "Todas las prioridades");
}

function rellenarSelect(id, array) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = array.map(v => `<option value="${v}">${v}</option>`).join('');
}

function rellenarSelectFiltro(id, array, defaultText) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = `<option value="">${defaultText}</option>` + array.map(v => `<option value="${v}">${v}</option>`).join('');
}

// PESTAÑA CONFIGURACIÓN Y ETIQUETAS DINÁMICAS (CORREGIDO Y OPERATIVO)
function renderConfigTags() {
  armarCajaTags("cfg-wrap-fuente", FUENTES, "fuente");
  armarCajaTags("cfg-wrap-producto", PRODUCTOS, "producto");
  armarCajaTags("cfg-wrap-presupuesto", PRESUPUESTOS, "presupuesto");
  armarCajaTags("cfg-wrap-estado", ESTADOS_PIPELINE, "estado");
}

function armarCajaTags(containerId, array, tipo) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  if (array.length === 0) {
    wrap.innerHTML = `<span style="color:var(--text3); font-size:12px;">Ninguno configurado</span>`;
    return;
  }
  wrap.innerHTML = array.map(val => `
    <span class="config-tag">
      ${val} 
      <i class="ti ti-x" style="margin-left:6px; cursor:pointer; color:var(--red);" onclick="eliminarConfigTag('${tipo}', '${val.replace(/'/g, "\\'")}')">❌</i>
    </span>
  `).join('');
}

async function agregarConfigTag(tipo) {
  const input = document.getElementById(`cfg-in-${tipo}`);
  if (!input) return;
  const valor = input.value.trim();
  if (!valor) return;

  if (tipo === 'fuente' && FUENTES.includes(valor)) return;
  if (tipo === 'producto' && PRODUCTOS.includes(valor)) return;
  if (tipo === 'presupuesto' && PRESUPUESTOS.includes(valor)) return;
  if (tipo === 'estado' && ESTADOS_PIPELINE.includes(valor)) return;

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from('crm_config').insert([{ tipo, valor }]);
      if (error) throw error;
      showToast(`¡${tipo} agregada con éxito!`);
      input.value = "";
      await cargarConfiguracionDebbieYListas();
    } catch (e) {
      showToast("Error al guardar en Supabase: " + e.message);
    }
  }
}

async function eliminarConfigTag(tipo, valor) {
  if (!confirm(`¿Estás seguro de que deseas eliminar la opción "${valor}"?`)) return;
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from('crm_config').delete().eq('tipo', tipo).eq('valor', valor);
      if (error) throw error;
      showToast("Elemento removido correctamente.");
      await cargarConfiguracionDebbieYListas();
    } catch (e) {
      showToast("Error al remover de Supabase: " + e.message);
    }
  }
}

async function cargarConfiguracionDebbieYListas() {
  await cargarConfiguracionDesdeSupabase();
}

// ADMINISTRADORES CONFIGURACIÓN
async function renderAdminUsersTable() {
  const tbody = document.getElementById("cfg-table-admins");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td>${AUTH_USER} (Principal)</td><td>•••••••• / Máximo</td><td>-</td></tr>`;
  ADMINS.forEach(a => {
    if (a.valor === 'Herbolaria') return;
    tbody.innerHTML += `
      <tr>
        <td>${a.valor}</td>
        <td>${a.extra} / Sub-cuenta</td>
        <td><button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="eliminarAdminUser(${a.id})">Eliminar</button></td>
      </tr>`;
  });
}

async function actualizarPasswordPrincipal() {
  const newPass = document.getElementById("cfg-main-pass").value.trim();
  if (!newPass) return;
  if (supabaseClient) {
    try {
      const { data: exist } = await supabaseClient.from('crm_config').select('*').eq('tipo', 'admin').eq('valor', 'Herbolaria');
      if (exist && exist.length > 0) {
        await supabaseClient.from('crm_config').update({ extra: newPass }).eq('valor', 'Herbolaria');
      } else {
        await supabaseClient.from('crm_config').insert([{ tipo: 'admin', valor: 'Herbolaria', extra: newPass }]);
      }
      AUTH_PASS = newPass;
      document.getElementById("cfg-main-pass").value = "";
      showToast("Contraseña principal actualizada.");
    } catch (e) {
      showToast("Error actualizando credencial: " + e.message);
    }
  }
}

async function agregarAdminUser() {
  const u = document.getElementById("cfg-add-user").value.trim();
  const p = document.getElementById("cfg-add-pass").value.trim();
  if (!u || !p) return;
  if (supabaseClient) {
    try {
      await supabaseClient.from('crm_config').insert([{ tipo: 'admin', valor: u, extra: p }]);
      document.getElementById("cfg-add-user").value = "";
      document.getElementById("cfg-add-pass").value = "";
      showToast("Nueva cuenta añadida.");
      await cargarConfiguracionDebbieYListas();
    } catch (e) {
      showToast("Error al añadir cuenta: " + e.message);
    }
  }
}

async function eliminarAdminUser(id) {
  if (!confirm("¿Eliminar este usuario de acceso?")) return;
  if (supabaseClient) {
    try {
      await supabaseClient.from('crm_config').delete().eq('id', id);
      showToast("Usuario removido.");
      await cargarConfiguracionDebbieYListas();
    } catch (e) {
      showToast("Error al remover usuario.");
    }
  }
}

// DASHBOARD: ANALÍTICA Y COMPONENTES VISUALES MOCK-CHARTS MANTENIDOS COMPLETOS
function procesarDashboardMétricasYGráficos() {
  document.getElementById("m-total").innerText = LEADS.length;
  const ganados = LEADS.filter(l => l.estado === 'Cerrado Ganado');
  document.getElementById("m-ganados").innerText = ganados.length;
  
  const tasa = LEADS.length > 0 ? ((ganados.length / LEADS.length) * 100).toFixed(1) : 0;
  document.getElementById("m-tasa").innerText = tasa + "%";

  const montoCerrado = ganados.reduce((acc, curr) => acc + (Number(curr.monto_cerrado) || 0), 0);
  document.getElementById("m-monto-cerrado").innerText = "$" + montoCerrado.toLocaleString('es-MX');

  const pipeline = LEADS.filter(l => l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado');
  const montoPotencial = pipeline.reduce((acc, curr) => acc + (Number(curr.monto_potencial) || 0), 0);
  document.getElementById("m-monto-potencial").innerText = "$" + montoPotencial.toLocaleString('es-MX');

  const hoy = new Date();
  const vencidos = LEADS.filter(l => {
    if (!l.proximoseg || l.estado === 'Cerrado Ganado' || l.estado === 'Cerrado Perdido' || l.estado === 'Abandonado') return false;
    return new Date(l.proximoseg) < hoy;
  });
  document.getElementById("m-vencidos").innerText = vencidos.length;

  document.getElementById("m-abandonados").innerText = LEADS.filter(l => l.estado === 'Abandonado').length;
  document.getElementById("m-perdidos").innerText = LEADS.filter(l => l.estado === 'Cerrado Perdido').length;

  // Renderizar gráficos simples CSS inside containers
  dibujarGraficoBarrasGenerico("chart-fuente", LEADS, 'fuente');
  dibujarGraficoBarrasGenerico("chart-estado", LEADS, 'estado');
  dibujarGraficoBarrasGenerico("chart-responsable", LEADS, 'responsable');
  dibujarGraficoBarrasGenerico("chart-producto", LEADS, 'producto');

  // Próximos seguimientos activos (Máximo 5)
  const activosSeg = pipeline.filter(l => l.proximoseg).sort((a,b) => new Date(a.proximoseg) - new Date(b.proximoseg)).slice(0, 5);
  const tbody = document.getElementById("dashboard-table-body");
  if (activosSeg.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="no-data-row">No hay seguimientos agendados activos</td></tr>`;
  } else {
    tbody.innerHTML = activosSeg.map(l => `
      <tr style="cursor:pointer;" onclick="abrirLeadParaEditar(${l.id})">
        <td>#${l.id}</td>
        <td><strong>${l.nombre}</strong></td>
        <td><span class="badge badge-default">${l.estado || 'Nuevo'}</span></td>
        <td>${l.responsable || 'Sin asignar'}</td>
        <td>${new Date(l.proximoseg).toLocaleString('es-MX', {dateStyle:'short', timeStyle:'short'})}</td>
        <td>$${(Number(l.monto_potencial) || 0).toLocaleString('es-MX')}</td>
      </tr>
    `).join('');
  }
}

function dibujarGraficoBarrasGenerico(idContenedor, dataset, propiedad) {
  const container = document.getElementById(idContenedor);
  if (!container) return;
  
  const conteos = {};
  dataset.forEach(item => {
    const val = item[propiedad] || 'No definido';
    conteos[val] = (conteos[val] || 0) + 1;
  });

  const llaves = Object.keys(conteos);
  if (llaves.length === 0) {
    container.innerHTML = `<div class="no-records">Sin registros</div>`;
    return;
  }

  const maxVal = Math.max(...Object.values(conteos));
  let html = `<div style="display:flex; flex-direction:column; gap:8px; padding:10px 0;">`;
  
  llaves.forEach(llave => {
    const count = conteos[llave];
    const pct = maxVal > 0 ? (count / maxVal) * 100 : 0;
    html += `
      <div style="font-size:12px;">
        <div style="display:flex; justify-content:between; margin-bottom:2px;">
          <span>${llave}</span>
          <span style="font-weight:bold; margin-left:auto;">${count}</span>
        </div>
        <div style="background:var(--bg2); border-radius:4px; height:8px; width:100%;">
          <div style="background:var(--green); width:${pct}%; height:100%; border-radius:4px;"></div>
        </div>
      </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

// PESTAÑA TODOS LOS LEADS Y FILTRADO
function renderTodosLosLeadsTabla() {
  const tbody = document.getElementById("leads-table-body");
  if (!tbody) return;
  
  const filtrados = obtenerLeadsFiltrados();
  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="no-data-row">Ningún lead coincide con los filtros aplicados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados.map(l => {
    const pSeg = l.proximoseg ? new Date(l.proximoseg).toLocaleString('es-MX', {dateStyle:'short', timeStyle:'short'}) : '-';
    return `
      <tr style="cursor:pointer;" onclick="abrirLeadParaEditar(${l.id})">
        <td>#${l.id}</td>
        <td>${l.created_at ? new Date(l.created_at).toLocaleDateString('es-MX') : '-'}</td>
        <td>
          <div style="font-weight:600; color:var(--text);">${l.nombre}</div>
          <div style="font-size:12px; color:var(--text2);">${l.empresa || ''}</div>
        </td>
        <td style="font-size:12px;">
          <div>${l.telefono || ''}</div>
          <div style="color:var(--text2);">${l.correo || ''}</div>
        </td>
        <td><span class="badge badge-default">${l.fuente || '-'}</span></td>
        <td style="max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.producto || '-'}</td>
        <td style="font-size:12px;">${l.responsable || '-'}</td>
        <td><span class="badge badge-default">${l.estado || 'Nuevo'}</span></td>
        <td><span class="badge badge-default">${l.prioridad || 'Media'}</span></td>
        <td style="font-size:12px;">${pSeg}</td>
        <td><strong>$${(Number(l.monto_potencial) || 0).toLocaleString('es-MX')}</strong></td>
      </tr>
    `;
  }).join('');
}

function filtrarTodosLosLeads() {
  renderTodosLosLeadsTabla();
}

function obtenerLeadsFiltrados() {
  const s = document.getElementById("f-search").value.toLowerCase();
  const f = document.getElementById("f-fuente").value;
  const e = document.getElementById("f-estado").value;
  const r = document.getElementById("f-responsable").value;
  const p = document.getElementById("f-prioridad").value;

  return LEADS.filter(l => {
    if (f && l.fuente !== f) return false;
    if (e && l.estado !== e) return false;
    if (r && l.responsable !== r) return false;
    if (p && l.prioridad !== p) return false;
    
    if (s) {
      const matchN = l.nombre ? l.nombre.toLowerCase().includes(s) : false;
      const matchE = l.empresa ? l.empresa.toLowerCase().includes(s) : false;
      const matchT = l.telefono ? l.telefono.includes(s) : false;
      return matchN || matchE || matchT;
    }
    return true;
  });
}

// PESTAÑA SEGUIMIENTO CON SEGMENTOS EN TABLAS INDEPENDIENTES
function renderPestañaSeguimiento() {
  const pipeline = LEADS.filter(l => l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado' && l.proximoseg);
  
  const ahora = new Date();
  const hoyStr = ahora.toLocaleDateString('es-MX');

  const vencidos = [];
  const hoyList = [];
  const futuros = [];

  pipeline.forEach(l => {
    const fSeg = new Date(l.proximoseg);
    if (fSeg < ahora && fSeg.toLocaleDateString('es-MX') !== hoyStr) {
      vencidos.push(l);
    } else if (fSeg.toLocaleDateString('es-MX') === hoyStr) {
      hoyList.push(l);
    } else {
      const limiteFuturo = new Date();
      limiteFuturo.setDate(limiteFuturo.getDate() + 14);
      if (fSeg <= limiteFuturo) futuros.push(l);
    }
  });

  document.getElementById("count-vencidos").innerText = vencidos.length;
  document.getElementById("count-hoy").innerText = hoyList.length;
  document.getElementById("count-futuros").innerText = futuros.length;

  llenarSubtablaSeguimiento("table-vencidos", vencidos);
  llenarSubtablaSeguimiento("table-hoy", hoyList);
  llenarSubtablaSeguimiento("table-futuros", futuros);
}

function llenarSubtablaSeguimiento(tableBodyId, list) {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="no-data-row">Sin leads en esta categoría ✓</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(l => `
    <tr style="cursor:pointer;" onclick="abrirLeadParaEditar(${l.id})">
      <td>#${l.id}</td>
      <td><strong>${l.nombre}</strong></td>
      <td>${l.fuente}</td>
      <td><span class="badge badge-default">${l.estado}</span></td>
      <td>${l.responsable}</td>
      <td>${new Date(l.proximoseg).toLocaleString('es-MX', {dateStyle:'short', timeStyle:'short'})}</td>
    </tr>
  `).join('');
}

// PESTAÑA REPORTES AVANZADOS
function procesarReportesAvanzados() {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const añoActual = ahora.getFullYear();

  const leadsMes = LEADS.filter(l => {
    if (!l.created_at) return false;
    const c = new Date(l.created_at);
    return c.getMonth() === mesActual && c.getFullYear() === añoActual;
  });
  document.getElementById("r-mensual").innerText = leadsMes.length;

  const ganados = LEADS.filter(l => l.estado === 'Cerrado Ganado');
  const tasa = LEADS.length > 0 ? ((ganados.length / LEADS.length) * 100).toFixed(1) : 0;
  document.getElementById("r-conversion").innerText = tasa + "%";

  const totalVendido = ganados.reduce((acc, curr) => acc + (Number(curr.monto_cerrado) || 0), 0);
  document.getElementById("r-total").innerText = "$" + totalVendido.toLocaleString('es-MX');

  const promedio = ganados.length > 0 ? Math.round(totalVendido / ganados.length) : 0;
  document.getElementById("r-promedio").innerText = "$" + promedio.toLocaleString('es-MX');

  // Render de Gráficos de Reportes
  dibujarGraficoReporteMeses();
  dibujarGraficoBarrasGenerico("chart-rep-canal", ganados, 'fuente');
  dibujarGraficoBarrasGenerico("chart-rep-responsable", ganados, 'responsable');
}

function dibujarGraficoReporteMeses() {
  const container = document.getElementById("chart-rep-mes");
  if (!container) return;
  
  const conteoMeses = {};
  LEADS.forEach(l => {
    if (!l.created_at) return;
    const f = new Date(l.created_at);
    const label = f.toLocaleString('es-MX', { month: 'short', year: '2-digit' });
    conteoMeses[label] = (conteoMeses[label] || 0) + 1;
  });

  const llaves = Object.keys(conteoMeses);
  if (llaves.length === 0) {
    container.innerHTML = `<div class="no-records">Sin registros</div>`;
    return;
  }

  const maxVal = Math.max(...Object.values(conteoMeses));
  let html = `<div style="display:flex; height:120px; align-items:flex-end; gap:16px; padding:20px 10px 0 10px; justify-content:center;">`;
  
  llaves.forEach(mes => {
    const count = conteoMeses[mes];
    const pct = maxVal > 0 ? (count / maxVal) * 100 : 0;
    html += `
      <div style="display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; flex:1; max-width:60px;">
        <span style="font-size:11px; font-weight:bold; margin-bottom:4px;">${count}</span>
        <div style="background:var(--green); width:100%; height:${pct}%; border-radius:4px 4px 0 0;"></div>
        <span style="font-size:10px; color:var(--text2); margin-top:4px; white-space:nowrap;">${mes}</span>
      </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

// FORMULARIO MODAL: CREAR, EDITAR Y RETROCEDER INTEGRACIÓN A BASE DE DATOS
function abrirLeadParaEditar(id) {
  const lead = LEADS.find(l => l.id === id);
  if (!lead) return;

  currentLeadId = lead.id;
  document.getElementById("panel-title").innerHTML = `<i class="ti ti-edit"></i> Editar Lead #${lead.id}`;
  
  document.getElementById("n-nombre").value = lead.nombre || "";
  document.getElementById("n-empresa").value = lead.empresa || "";
  document.getElementById("n-telefono").value = lead.telefono || "";
  document.getElementById("n-correo").value = lead.correo || "";
  document.getElementById("n-ciudad").value = lead.ciudad || "";
  document.getElementById("n-estado").value = lead.estado_rep || "";
  
  document.getElementById("n-fuente").value = lead.fuente || FUENTES[0] || "";
  document.getElementById("n-producto").value = lead.producto || PRODUCTOS[0] || "";
  document.getElementById("n-presupuesto").value = lead.presupuesto || PRESUPUESTOS[0] || "";
  document.getElementById("n-responsable").value = lead.responsable || RESPONSABLES[0] || "";
  document.getElementById("n-prioridad").value = lead.prioridad || "Media";
  document.getElementById("n-situacion").value = lead.estado || "Nuevo";

  if (lead.proximoseg) {
    const localDateTime = new Date(lead.proximoseg).toISOString().slice(0, 16);
    document.getElementById("n-seg").value = localDateTime;
  } else {
    document.getElementById("n-seg").value = "";
  }

  document.getElementById("n-notas").value = lead.notas || "";
  document.getElementById("btn-delete-lead").style.display = "block";

  togglePanel(true);
}

function openNewLead() {
  currentLeadId = null;
  document.getElementById("panel-title").innerHTML = `<i class="ti ti-user-plus"></i> Nuevo Lead`;
  
  document.getElementById("n-nombre").value = "";
  document.getElementById("n-empresa").value = "";
  document.getElementById("n-telefono").value = "";
  document.getElementById("n-correo").value = "";
  document.getElementById("n-ciudad").value = "";
  document.getElementById("n-estado").value = "";
  
  document.getElementById("n-fuente").selectedIndex = 0;
  document.getElementById("n-producto").selectedIndex = 0;
  document.getElementById("n-presupuesto").selectedIndex = 0;
  document.getElementById("n-responsable").selectedIndex = 0;
  document.getElementById("n-prioridad").value = "Media";
  document.getElementById("n-situacion").value = "Nuevo";
  document.getElementById("n-seg").value = "";
  document.getElementById("n-notes").value = "";

  document.getElementById("btn-delete-lead").style.display = "none";
  togglePanel(true);
}

async function guardarLeadFormulario() {
  const nombre = document.getElementById("n-nombre").value.trim();
  if (!nombre) {
    alert("El campo Nombre Completo es obligatorio.");
    return;
  }

  const payload = {
    nombre: nombre,
    empresa: document.getElementById("n-empresa").value.trim(),
    telefono: document.getElementById("n-telefono").value.trim(),
    correo: document.getElementById("n-correo").value.trim(),
    ciudad: document.getElementById("n-ciudad").value.trim(),
    estado_rep: document.getElementById("n-estado").value.trim(),
    fuente: document.getElementById("n-fuente").value,
    producto: document.getElementById("n-producto").value,
    presupuesto: document.getElementById("n-presupuesto").value,
    responsable: document.getElementById("n-responsable").value,
    prioridad: document.getElementById("n-prioridad").value,
    estado: document.getElementById("n-situacion").value,
    proximoseg: document.getElementById("n-seg").value || null,
    notas: document.getElementById("n-notas").value.trim()
  };

  if (payload.estado === 'Cerrado Ganado') {
    if (currentLeadId) {
      const original = LEADS.find(l => l.id === currentLeadId);
      payload.monto_cerrado = original && original.monto_cerrado ? original.monto_cerrado : dePresupuestoANumero(payload.presupuesto);
    } else {
      payload.monto_cerrado = dePresupuestoANumero(payload.presupuesto);
    }
    payload.monto_potencial = 0;
  } else if (payload.estado === 'Cerrado Perdido' || payload.estado === 'Abandonado') {
    payload.monto_cerrado = 0;
    payload.monto_potencial = 0;
  } else {
    payload.monto_potencial = dePresupuestoANumero(payload.presupuesto);
    payload.monto_cerrado = 0;
  }

  if (supabaseClient) {
    try {
      if (currentLeadId) {
        const { error } = await supabaseClient.from('crm_leads').update(payload).eq('id', currentLeadId);
        if (error) throw error;
        showToast("¡Lead actualizado con éxito!");
      } else {
        const { error } = await supabaseClient.from('crm_leads').insert([payload]);
        if (error) throw error;
        showToast("¡Nuevo lead creado con éxito!");
      }
      togglePanel(false);
      await fetchLeadsDesdeSupabase();
    } catch (e) {
      showToast("Error al guardar: " + e.message);
    }
  }
}

async function eliminarLeadActual() {
  if (!currentLeadId) return;
  if (!confirm("¿Estás completamente seguro de que deseas eliminar este lead del sistema de forma permanente?")) return;
  
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from('crm_leads').delete().eq('id', currentLeadId);
      if (error) throw error;
      showToast("Lead eliminado permanentemente.");
      togglePanel(false);
      await fetchLeadsDesdeSupabase();
    } catch (e) {
      showToast("Error al eliminar: " + e.message);
    }
  }
}

function dePresupuestoANumero(txt) {
  if (!txt) return 0;
  if (txt.includes('<')) return 2500;
  if (txt.includes('>')) return 60000;
  const match = txt.replace(/[^0-9\-]/g, '').split('-');
  if (match.length === 2) {
    return Math.round((Number(match[0]) + Number(match[1])) / 2);
  }
  return Number(match[0]) || 0;
}

// TOAST NOTIFICACIONES
function showToast(msg) {
  const t = document.getElementById("notif-toast");
  if (!t) return;
  t.innerText = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3500);
}

// ALERTAS DE DIAS DE HOY
function evaluarRecordatoriosHoy(leads) {
  const hoyStr = new Date().toLocaleDateString('es-MX');
  
  const hoyLeads = leads ? leads.filter(l => {
    if (!l.proximoseg) return false;
    const f = new Date(l.proximoseg);
    return f.toLocaleDateString('es-MX') === hoyStr && l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado';
  }) : [];

  if (hoyLeads.length > 0) {
    setTimeout(() => {
      alert(`📢 ¡Recordatorio!\\nTienes (${hoyLeads.length}) seguimientos agendados para hoy.`);
    }, 1000);
  }
}

// EXPORTAR A CSV
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

// FUNCIÓN PARA MOSTRAR / OCULTAR EL PANEL LATERAL FLOTANTE
function togglePanel(show) {
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('panel');
  if (overlay && panel) {
    if (show) {
      overlay.classList.add('active');
      panel.classList.add('active');
    } else {
      overlay.classList.remove('active');
      panel.classList.remove('active');
    }
  }
}

function closePanel(e) {
  if (!e || e.target.id === 'overlay') {
    togglePanel(false);
  }
}
