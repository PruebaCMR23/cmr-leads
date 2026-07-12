// ─── CONFIGURACIÓN DE CONEXIÓN CON SUPABASE ───────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

// CREDENCIALES EXCLUSIVAS ACTUALIZADAS
const AUTH_USER = "a";
const AUTH_PASS = "s"; 

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
let PIPELINE_ETAPAS = [];
let LEADS_GLOBAL = [];

// Instancia global de Supabase Client
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── FUNCIÓN DE CAMBIO DE PESTAÑAS (TABS) ──────────────────────────────────────
function cambiarTab(tabName) {
  const tabs = ['dashboard', 'leads', 'seguimiento', 'config'];
  tabs.forEach(t => {
    const elTab = document.getElementById(`tab-${t}`);
    const elBtn = document.getElementById(`t-${t}`);
    if (elTab) elTab.style.display = (t === tabName) ? 'block' : 'none';
    if (elBtn) {
      if (t === tabName) elBtn.classList.add('active');
      else elBtn.classList.remove('active');
    }
  });

  if (tabName === 'dashboard') {
    renderDashboardKPIs(LEADS_GLOBAL);
    renderDashboardCharts(LEADS_GLOBAL);
    renderDashboardSeguimientos(LEADS_GLOBAL);
  }
  if (tabName === 'leads') filtrarLeads();
  if (tabName === 'seguimiento') filtrarSeguimientosPorTiempo();
}

// ─── MANEJO DE CONFIGURACIONES DESDE SUPABASE ──────────────────────────────────
async function cargarDatosDesdeSupabase() {
  try {
    const { data: configData, error: configError } = await _supabase
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .single();

    if (!configError && configData) {
      document.getElementById('app-title').innerText = configData.nombre_app || 'CRM Leads';
      document.getElementById('cfg-nombre-app').value = configData.nombre_app || '';
      document.getElementById('cfg-moneda').value = configData.moneda || 'MXN';

      ADMINS = configData.admins || [];
      FUENTES = configData.fuentes || [];
      PRODUCTOS = configData.productos || [];
      PRESUPUESTOS = configData.presupuestos || [];
      if (configData.responsables && configData.responsables.length > 0) RESPONSABLES = configData.responsables;
      if (configData.ejecutives && configData.ejecutives.length > 0) EJECUTIVOS = configData.ejecutives;
      PIPELINE_ETAPAS = configData.pipeline_etapas || [];
    }

    const { data: leadsData, error: leadsError } = await _supabase
      .from('leads')
      .select('*')
      .order('fechacreacion', { ascending: false });

    if (!leadsError && leadsData) {
      LEADS_GLOBAL = leadsData;
    }

    actualizarSelectsFormulario();
    actualizarSelectsFiltros();
    llenarConfiguracionVisual();

    renderDashboardKPIs(LEADS_GLOBAL);
    renderDashboardCharts(LEADS_GLOBAL);
    renderDashboardSeguimientos(LEADS_GLOBAL);
    renderTableLeads(LEADS_GLOBAL);
    filtrarSeguimientosPorTiempo();

    verificarSeguimientosHoy(LEADS_GLOBAL);

  } catch (err) {
    console.error("Error en sincronización inicial:", err);
  }
}

// ─── LLENADO DINÁMICO DE SELECTORES (FORMULARIO) ──────────────────────────────
function actualizarSelectsFormulario() {
  llenarSelect('n-fuente', FUENTES, 'Seleccionar fuente…');
  llenarSelect('n-producto', PRODUCTOS, 'Seleccionar producto…');
  llenarSelect('n-presupuesto', PRESUPUESTOS, 'Seleccionar…');
  llenarSelect('n-responsable', RESPONSABLES, 'Seleccionar…');
  llenarSelect('n-ejecutivo', EJECUTIVOS, 'Seleccionar…');
  llenarSelect('n-situacion', PIPELINE_ETAPAS, 'Selecciona etapa...');
}

function llenarSelect(elementId, arrayData, placeholder) {
  const sel = document.getElementById(elementId);
  if (!sel) return;
  let html = `<option value="">${placeholder}</option>`;
  arrayData.forEach(item => {
    html += `<option value="${item}">${item}</option>`;
  });
  sel.innerHTML = html;
}

function actualizarSelectsFiltros() {
  llenarSelectFiltro('filter-etapa', PIPELINE_ETAPAS, 'Todas las etapas');
  llenarSelectFiltro('filter-fuente', FUENTES, 'Todas las fuentes');
  llenarSelectFiltro('filter-ejecutivo', EJECUTIVOS, 'Todos los ejecutivos');
}

function llenarSelectFiltro(elementId, arrayData, placeholder) {
  const sel = document.getElementById(elementId);
  if (!sel) return;
  let html = `<option value="">${placeholder}</option>`;
  arrayData.forEach(item => {
    html += `<option value="${item}">${item}</option>`;
  });
  sel.innerHTML = html;
}

// ─── MÓDULO VISUAL DE CONFIGURACIÓN DE PARÁMETROS ──────────────────────────────
function llenarConfiguracionVisual() {
  renderTagsConfig('box-etapas', PIPELINE_ETAPAS, 'pipeline_etapas');
  renderTagsConfig('box-productos', PRODUCTOS, 'productos');
  renderTagsConfig('box-fuentes', FUENTES, 'fuentes');
  renderTagsConfig('box-ejecutivos', EJECUTIVOS, 'ejecutives');
}

function renderTagsConfig(containerId, arrayData, campoSql) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let html = '';
  arrayData.forEach((item, index) => {
    html += `
      <div class="config-tag">
        <span>${item}</span>
        <i class="ti ti-x" style="cursor:pointer;" onclick="eliminarElementoConfig('${campoSql}', ${index})"></i>
      </div>
    `;
  });
  container.innerHTML = html || '<span style="font-size:12px; color:var(--text3);">Lista vacía.</span>';
}

async function guardarConfigGeneral() {
  const nombre = document.getElementById('cfg-nombre-app').value.trim();
  const moneda = document.getElementById('cfg-moneda').value;
  if (!nombre) return alert("El nombre de la aplicación no puede estar vacío.");
  try {
    const { error } = await _supabase.from('configuracion').update({ nombre_app: nombre, moneda: moneda }).eq('id', 1);
    if (error) throw error;
    showNotification("Configuración general guardada con éxito.");
    await cargarDatosDesdeSupabase();
  } catch (err) { alert("Error: " + err.message); }
}

async function agregarElementoConfig(campoSql, inputId) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const valor = inp.value.trim();
  if (!valor) return alert("Ingresa un valor válido.");
  let arrayActual = campoSql === 'pipeline_etapas' ? [...PIPELINE_ETAPAS] : campoSql === 'productos' ? [...PRODUCTOS] : campoSql === 'fuentes' ? [...FUENTES] : [...EJECUTIVOS];
  if (arrayActual.includes(valor)) return alert("Ese elemento ya existe.");
  arrayActual.push(valor);
  try {
    const payload = {}; payload[campoSql] = arrayActual;
    const { error } = await _supabase.from('configuracion').update(payload).eq('id', 1);
    if (error) throw error;
    inp.value = '';
    showNotification("Elemento añadido correctamente.");
    await cargarDatosDesdeSupabase();
  } catch (err) { alert("Error: " + err.message); }
}

async function eliminarElementoConfig(campoSql, index) {
  if (!confirm("¿Deseas remover este parámetro?")) return;
  let arrayActual = campoSql === 'pipeline_etapas' ? [...PIPELINE_ETAPAS] : campoSql === 'productos' ? [...PRODUCTOS] : campoSql === 'fuentes' ? [...FUENTES] : [...EJECUTIVOS];
  arrayActual.splice(index, 1);
  try {
    const payload = {}; payload[campoSql] = arrayActual;
    const { error } = await _supabase.from('configuracion').update(payload).eq('id', 1);
    if (error) throw error;
    showNotification("Elemento removido.");
    await cargarDatosDesdeSupabase();
  } catch (err) { alert("Error: " + err.message); }
}

// ─── RENDIMIENTO Y CÁLCULOS RESTAURADOS DEL DASHBOARD (MÉTRICAS INDEPENDIENTES) ───
function renderDashboardKPIs(leads) {
  const ahora = new Date();
  let totalLeads = leads.length;
  let cerradosGanados = 0;
  let montoCerrado = 0;
  let pipelinePotencial = 0;
  let segVencidos = 0;
  let abandonados = 0;
  let cerradosPerdidos = 0;

  leads.forEach(l => {
    const monto = parseFloat(l.monto) || 0;
    const est = (l.estado || '').toLowerCase();

    if (est === 'cerrado ganado') {
      cerradosGanados++;
      montoCerrado += monto;
    } else if (est === 'abandonado') {
      abandonados++;
    } else if (est === 'cerrado perdido') {
      cerradosPerdidos++;
    } else {
      pipelinePotencial += monto;
    }

    if (l.proximoseg && est !== 'cerrado ganado' && est !== 'cerrado perdido' && est !== 'abandonado') {
      if (new Date(l.proximoseg) < ahora) {
        segVencidos++;
      }
    }
  });

  const tasaConversion = totalLeads > 0 ? ((cerradosGanados / totalLeads) * 100).toFixed(1) : 0;

  document.getElementById('kpi-total-leads').innerText = totalLeads;
  document.getElementById('kpi-cerrados-ganados').innerText = cerradosGanados;
  document.getElementById('kpi-tasa-conversion').innerText = `${tasaConversion}%`;
  document.getElementById('kpi-progress-bar').style.width = `${tasaConversion}%`;
  document.getElementById('kpi-monto-cerrado').innerText = `$${montoCerrado.toLocaleString('es-MX')}`;
  document.getElementById('kpi-pipeline-potencial').innerText = `$${pipelinePotencial.toLocaleString('es-MX')}`;
  document.getElementById('kpi-seg-vencidos').innerText = segVencidos;
  document.getElementById('kpi-abandonados').innerText = abandonados;
  document.getElementById('kpi-cerrados-perdidos').innerText = cerradosPerdidos;
}

// ─── GRÁFICOS RESTAURADOS TOTALMENTE POR BLOQUE INDEPENDIENTE ─────────────────────
function renderDashboardCharts(leads) {
  // 1. Leads por Fuente
  const chartFuentes = document.getElementById('chart-fuentes');
  if (chartFuentes) {
    const conteo = {}; FUENTES.forEach(f => conteo[f] = 0);
    leads.forEach(l => { if (conteo[l.fuente] !== undefined) conteo[l.fuente]++; });
    chartFuentes.innerHTML = generarHTMLBarras(conteo, '#185fa5', false);
  }

  // 2. Estado del Pipeline
  const chartEtapas = document.getElementById('chart-etapas');
  if (chartEtapas) {
    const conteo = {}; PIPELINE_ETAPAS.forEach(e => conteo[e] = 0);
    leads.forEach(l => { if (conteo[l.estado] !== undefined) conteo[l.estado]++; });
    chartEtapas.innerHTML = generarHTMLBarras(conteo, 'var(--green)', false);
  }

  // 3. Leads por Responsable
  const chartResp = document.getElementById('chart-responsables');
  if (chartResp) {
    const conteo = {}; RESPONSABLES.forEach(r => conteo[r] = 0);
    leads.forEach(l => { if (conteo[l.responsable] !== undefined) conteo[l.responsable]++; });
    chartResp.innerHTML = generarHTMLBarras(conteo, '#ba7517', false);
  }

  // 4. Productos con más interés
  const chartProd = document.getElementById('chart-productos');
  if (chartProd) {
    const conteo = {}; PRODUCTOS.forEach(p => conteo[p] = 0);
    leads.forEach(l => { if (conteo[l.producto] !== undefined) conteo[l.producto]++; });
    chartProd.innerHTML = generarHTMLBarras(conteo, '#534AB7', false);
  }
}

function generarHTMLBarras(objetoDatos, color, esMoneda) {
  let max = 0; html = '';
  Object.values(objetoDatos).forEach(v => { if (v > max) max = v; });
  Object.keys(objetoDatos).forEach(k => {
    const val = objetoDatos[k];
    const pct = max > 0 ? (val / max) * 100 : 0;
    html += `
      <div class="bar-row">
        <div class="bar-label" title="${k}">${k}</div>
        <div class="bar-track"><div class="bar-fill" style="width: ${pct}%; background: ${color};"></div></div>
        <div class="bar-count">${esMoneda ? '$' + val.toLocaleString('es-MX') : val}</div>
      </div>`;
  });
  return html || '<div class="empty">Sin datos acumulados</div>';
}

// ─── TABLA INFERIOR DE DASHBOARD: PRÓXIMOS SEGUIMIENTOS ACTIVOS ─────────────────
function renderDashboardSeguimientos(leads) {
  const tbody = document.getElementById('table-dashboard-seguimientos');
  if (!tbody) return;
  tbody.innerHTML = '';

  const activos = leads.filter(l => l.proximoseg && l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado')
                       .sort((a,b) => new Date(a.proximoseg) - new Date(b.proximoseg));

  if (activos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">No hay próximos seguimientos activos programados.</td></tr>`;
    return;
  }

  activos.slice(0, 10).forEach(l => {
    const tr = document.createElement('tr');
    tr.onclick = () => abrirPanelEditar(l);
    const fStr = new Date(l.proximoseg).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'});
    tr.innerHTML = `
      <td><strong>#${l.id}</strong></td>
      <td><div class="td-name">${l.nombre || 'Sin Nombre'}</div></td>
      <td><span class="badge b-nuevo">${l.estado || 'Nuevo'}</span></td>
      <td>${l.responsable || 'Sin Asignar'}</td>
      <td><span style="font-weight:600; color:var(--green);">${fStr}</span></td>
      <td><strong>$${(parseFloat(l.monto) || 0).toLocaleString('es-MX')}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── RENDERIZADO GENERAL Y FILTRADO DE LA TABLA DE BASE DE LEADS ─────────────────
function renderTableLeads(leads) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return; tbody.innerHTML = '';
  if (leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Ningún lead coincide con la búsqueda.</td></tr>`; return;
  }
  leads.forEach(l => {
    const tr = document.createElement('tr'); tr.onclick = () => abrirPanelEditar(l);
    const montoNum = parseFloat(l.monto) || 0;
    let cleanPhone = l.telefono ? l.telefono.replace(/\D/g, '') : '';
    let waHtml = '—';
    if (cleanPhone) {
      if (cleanPhone.length === 10) cleanPhone = '52' + cleanPhone;
      waHtml = `<a class="wa-link" href="https://wa.me/${cleanPhone}" target="_blank" onclick="event.stopPropagation();"><i class="ti ti-brand-whatsapp"></i> ${l.telefono}</a>`;
    }
    let fechaSegStr = l.proximoseg ? new Date(l.proximoseg).toLocaleDateString('es-MX') : '—';
    tr.innerHTML = `
      <td><div class="td-name"><div class="avatar">${(l.nombre||'?').charAt(0).toUpperCase()}</div><div><strong>${l.nombre||'—'}</strong><div class="td-muted">${l.empresa||'Particular'}</div></div></div></td>
      <td><div>${waHtml}</div><div class="td-muted" style="font-size:11px;">${l.correo||'—'}</div></td>
      <td><strong>$${montoNum.toLocaleString('es-MX')}</strong><div class="td-muted">${l.producto||'—'}</div></td>
      <td><span style="font-size:12px;">${l.fuente||'—'}</span></td>
      <td><div style="font-size:12px;">${l.ejecutivo||'—'}</div><div class="td-muted" style="font-size:10px;">${l.responsable||'—'}</div></td>
      <td><span class="badge b-contactado">${l.estado||'Nuevo'}</span><span class="badge b-media" style="margin-left:4px; font-size:9px;">${l.prioridad||'Media'}</span></td>
      <td style="font-size:12px; font-weight:500;">${fechaSegStr}</td>`;
    tbody.appendChild(tr);
  });
}

function filtrarLeads() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const fEtapa = document.getElementById('filter-etapa').value;
  const fFuente = document.getElementById('filter-fuente').value;
  const fEjecutivo = document.getElementById('filter-ejecutivo').value;

  const filtrados = LEADS_GLOBAL.filter(l => {
    const matchQ = (l.nombre || '').toLowerCase().includes(query) || (l.empresa || '').toLowerCase().includes(query) || (l.telefono || '').includes(query);
    return matchQ && (fEtapa === '' || l.estado === fEtapa) && (fFuente === '' || l.fuente === fFuente) && (fEjecutivo === '' || l.ejecutivo === fEjecutivo);
  });
  renderTableLeads(filtrados);
  document.getElementById('leads-count').innerText = `Mostrando: ${filtrados.length} leads`;
}

// ─── REPORTE CRÍTICO COMPLETO: VENCIDO, PARA HOY, PROXIMOS 14 DÍAS ────────────────
function filtrarSeguimientosPorTiempo() {
  const tbody = document.getElementById('table-seg-dinamico');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filtro = document.getElementById('filter-reporte-tiempo').value;
  const ahora = new Date();
  
  // Clona fecha de hoy limpia de horas
  const hoyInicio = new Date(); hoyInicio.setHours(0,0,0,0);
  const hoyFin = new Date(); hoyFin.setHours(23,59,59,999);
  
  const limite14Dias = new Date(); limite14Dias.setDate(ahora.getDate() + 14); limite14Dias.setHours(23,59,59,999);

  const filtrados = LEADS_GLOBAL.filter(l => {
    if (!l.proximoseg) return false;
    const est = (l.estado || '').toLowerCase();
    if (est === 'cerrado ganado' || est === 'cerrado perdido' || est === 'abandonado') return false;

    const fSeg = new Date(l.proximoseg);

    if (filtro === 'vencido') {
      return fSeg < ahora;
    } else if (filtro === 'hoy') {
      return fSeg >= hoyInicio && fSeg <= hoyFin;
    } else if (filtro === '14dias') {
      return fSeg >= ahora && fSeg <= limite14Dias;
    }
    return true; // "todos"
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Ningún seguimiento programado coincide con el filtro temporal.</td></tr>`;
    return;
  }

  filtrados.forEach(l => {
    const tr = document.createElement('tr'); tr.onclick = () => abrirPanelEditar(l);
    let cleanPhone = l.telefono ? l.telefono.replace(/\D/g, '') : '';
    let waHtml = cleanPhone ? `<a class="wa-link" href="https://wa.me/52${cleanPhone.slice(-10)}" target="_blank" onclick="event.stopPropagation();"><i class="ti ti-brand-whatsapp"></i> ${l.telefono}</a>` : '—';
    const fechaFormateada = new Date(l.proximoseg).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

    tr.innerHTML = `
      <td><strong>${l.nombre || '—'}</strong><div style="font-size:11px; color:var(--text2);">${l.empresa || 'Particular'}</div></td>
      <td>${waHtml}</td>
      <td>${l.producto || '—'}<div style="font-size:11px; color:var(--text3);">$${(parseFloat(l.monto)||0).toLocaleString('es-MX')}</div></td>
      <td><span style="font-size:12px;">${l.ejecutivo || 'Sin ejecutivo'}</span></td>
      <td><span style="font-weight:600; color: #a32d2d;">${fechaFormateada}</span></td>
      <td><div style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px;">${l.notas || 'Sin anotaciones.'}</div></td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── CONTROL INTACTO DE DESPLAZAMIENTO Y DESPLIEGUE DEL PANEL LATERAL ──────────────
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

function abrirPanelNuevo() {
  document.getElementById('panel-title-text').innerText = "Nuevo Lead / Registro";
  document.getElementById('n-id').value = '';
  document.getElementById('n-nombre').value = '';
  document.getElementById('n-empresa').value = '';
  document.getElementById('n-telefono').value = '';
  document.getElementById('n-correo').value = '';
  document.getElementById('n-ciudad').value = '';
  document.getElementById('n-estado-geo').value = '';
  document.getElementById('n-fuente').value = '';
  document.getElementById('n-producto').value = '';
  document.getElementById('n-presupuesto').value = '';
  document.getElementById('n-responsable').value = '';
  document.getElementById('n-ejecutivo').value = '';
  document.getElementById('n-prioridad').value = 'Media';
  document.getElementById('n-situacion').value = PIPELINE_ETAPAS[0] || '';
  document.getElementById('n-monto').value = 0;
  document.getElementById('n-seg').value = '';
  document.getElementById('n-notas').value = '';

  document.getElementById('btn-delete-lead').style.display = 'none';
  togglePanel(true);
}

function abrirPanelEditar(lead) {
  document.getElementById('panel-title-text').innerText = "Expediente y Modificación de Lead";
  document.getElementById('n-id').value = lead.id;
  document.getElementById('n-nombre').value = lead.nombre || '';
  document.getElementById('n-empresa').value = lead.empresa || '';
  document.getElementById('n-telefono').value = lead.telefono || '';
  document.getElementById('n-correo').value = lead.correo || '';
  document.getElementById('n-ciudad').value = lead.ciudad || '';
  document.getElementById('n-estado-geo').value = lead.estado_geo || '';
  document.getElementById('n-fuente').value = lead.fuente || '';
  document.getElementById('n-producto').value = lead.producto || '';
  document.getElementById('n-presupuesto').value = lead.presupuesto || '';
  document.getElementById('n-responsable').value = lead.responsable || '';
  document.getElementById('n-ejecutivo').value = lead.ejecutivo || '';
  document.getElementById('n-prioridad').value = lead.prioridad || 'Media';
  document.getElementById('n-situacion').value = lead.estado || '';
  document.getElementById('n-monto').value = lead.monto || 0;
  
  if (lead.proximoseg) {
    const d = new Date(lead.proximoseg);
    const offset = d.getTimezoneOffset() * 60000;
    document.getElementById('n-seg').value = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
  } else {
    document.getElementById('n-seg').value = '';
  }
  document.getElementById('n-notas').value = lead.notas || '';

  document.getElementById('btn-delete-lead').style.display = 'inline-flex';
  togglePanel(true);
}

// ACCIONES DE GUARDADO Y ELIMINACIÓN DIRECTA
async function guardarLeadSupabase() {
  const id = document.getElementById('n-id').value;
  const nombre = document.getElementById('n-nombre').value.trim();
  if (!nombre) return alert("El nombre del cliente es obligatorio.");

  const fSegValue = document.getElementById('n-seg').value;
  let proximosegISO = fSegValue ? new Date(fSegValue).toISOString() : null;

  const payload = {
    nombre: nombre,
    empresa: document.getElementById('n-empresa').value.trim(),
    telefono: document.getElementById('n-telefono').value.trim(),
    correo: document.getElementById('n-correo').value.trim(),
    ciudad: document.getElementById('n-ciudad').value.trim(),
    estado_geo: document.getElementById('n-estado-geo').value.trim(),
    fuente: document.getElementById('n-fuente').value,
    producto: document.getElementById('n-producto').value,
    presupuesto: document.getElementById('n-presupuesto').value,
    responsable: document.getElementById('n-responsable').value,
    ejecutivo: document.getElementById('n-ejecutivo').value,
    prioridad: document.getElementById('n-prioridad').value,
    estado: document.getElementById('n-situacion').value,
    monto: parseFloat(document.getElementById('n-monto').value) || 0,
    proximoseg: proximosegISO,
    notas: document.getElementById('n-notas').value.trim(),
    fechaactualizacion: new Date().toISOString()
  };

  try {
    if (id) {
      await _supabase.from('leads').update(payload).eq('id', id);
      showNotification("Expediente actualizado de forma transparente.");
    } else {
      await _supabase.from('leads').insert([payload]);
      showNotification("Nuevo prospecto guardado con éxito.");
    }
    togglePanel(false);
    await cargarDatosDesdeSupabase();
  } catch (err) { alert("Error al guardar: " + err.message); }
}

async function eliminarLeadActual() {
  const id = document.getElementById('n-id').value; if (!id) return;
  if (!confirm("¿Deseas eliminar permanentemente este registro?")) return;
  try {
    await _supabase.from('leads').delete().eq('id', id);
    showNotification("Registro borrado permanentemente.");
    togglePanel(false); await cargarDatosDesdeSupabase();
  } catch (err) { alert("Error: " + err.message); }
}

function showNotification(msg) {
  const n = document.getElementById('notif'); if (!n) return;
  n.innerText = msg; n.style.display = 'block';
  setTimeout(() => { n.style.display = 'none'; }, 3500);
}

function handleLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  if ((user === AUTH_USER && pass === AUTH_PASS) || ADMINS.find(u => u.user === user && u.pass === pass)) {
    sessionStorage.setItem('crm_logged_in', 'true');
    document.getElementById('login-container').style.display = 'none';
    showNotification("Acceso Correcto.");
  } else { document.getElementById('login-error').style.display = 'block'; }
}

function verificarSeguimientosHoy(leads) {
  const hoyStr = new Date().toLocaleDateString('es-MX');
  const conteo = leads.filter(l => l.proximoseg && new Date(l.proximoseg).toLocaleDateString('es-MX') === hoyStr && l.estado !== 'Cerrado Ganado').length;
  if (conteo > 0) alert(`📢 Tienes (${conteo}) seguimientos programados para hoy.`);
}

window.onload = async function() {
  await cargarDatosDesdeSupabase();
  if (sessionStorage.getItem('crm_logged_in') === 'true') {
    document.getElementById('login-container').style.display = 'none';
  }
};
