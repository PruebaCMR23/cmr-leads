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

  if (tabName === 'dashboard') renderDashboardCharts(LEADS_GLOBAL);
  if (tabName === 'leads') filtrarLeads();
  if (tabName === 'seguimiento') cargarSeguimientosInterfaz(LEADS_GLOBAL);
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
    renderTableLeads(LEADS_GLOBAL);
    cargarSeguimientosInterfaz(LEADS_GLOBAL);

    verificarSeguimientosHoy(LEADS_GLOBAL);

  } catch (err) {
    console.error("Error en sincronización inicial:", err);
  }
}

// ─── LLENADO DINÁMICO DE SELECTORES (FORMULARIO) ──────────────────────────────
function actualizarSelectsFormulario() {
  llenarSelect('n-fuente', FUENTES, 'Selecciona origen...');
  llenarSelect('n-producto', PRODUCTOS, 'Selecciona producto...');
  llenarSelect('n-presupuesto', PRESUPUESTOS, 'Selecciona rango...');
  llenarSelect('n-responsable', RESPONSABLES, 'Selecciona área...');
  llenarSelect('n-ejecutivo', EJECUTIVOS, 'Selecciona asesor...');
  llenarSelect('n-situacion', PIPELINE_ETAPAS, 'Selecciona etapa...');

  const prioSel = document.getElementById('n-prioridad');
  if (prioSel) {
    prioSel.innerHTML = `
      <option value="Baja">Baja</option>
      <option value="Media" selected>Media</option>
      <option value="Alta">Alta</option>
    `;
  }
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

// ─── LLENADO DINÁMICO DE SELECTORES (FILTROS DE BÚSQUEDA) ──────────────────────
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

  const userBox = document.getElementById('box-usuarios');
  if (userBox) {
    let html = '';
    ADMINS.forEach((u, index) => {
      html += `
        <div class="config-tag" style="border-radius:6px; padding:6px 12px; margin-bottom:6px; display:flex; justify-content:between; width:100%; max-width:400px;">
          <span><strong>${u.user}</strong> (Pass: ${u.pass})</span>
          <i class="ti ti-x" style="cursor:pointer; color:#a32d2d; margin-left:auto;" onclick="eliminarUsuarioConfig(${index})"></i>
        </div>
      `;
    });
    userBox.innerHTML = html || '<div style="font-size:12px; color:var(--text3);">No hay usuarios adicionales configurados.</div>';
  }
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

// ─── GUARDAR CAMBIOS DE CONFIGURACIÓN EN SUPABASE ──────────────────────────────
async function guardarConfigGeneral() {
  const nombre = document.getElementById('cfg-nombre-app').value.trim();
  const moneda = document.getElementById('cfg-moneda').value;

  if (!nombre) return alert("El nombre de la aplicación no puede estar vacío.");

  try {
    const { error } = await _supabase
      .from('configuracion')
      .update({ nombre_app: nombre, moneda: moneda })
      .eq('id', 1);

    if (error) throw error;
    showNotification("Configuración general guardada con éxito.");
    await cargarDatosDesdeSupabase();
  } catch (err) {
    alert("Error al guardar: " + err.message);
  }
}

async function agregarElementoConfig(campoSql, inputId) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const valor = inp.value.trim();
  if (!valor) return alert("Ingresa un valor válido.");

  let arrayActual = [];
  if (campoSql === 'pipeline_etapas') arrayActual = [...PIPELINE_ETAPAS];
  if (campoSql === 'productos') arrayActual = [...PRODUCTOS];
  if (campoSql === 'fuentes') arrayActual = [...FUENTES];
  if (campoSql === 'ejecutives') arrayActual = [...EJECUTIVOS];

  if (arrayActual.includes(valor)) return alert("Ese elemento ya existe.");
  arrayActual.push(valor);

  try {
    const payload = {};
    payload[campoSql] = arrayActual;

    const { error } = await _supabase
      .from('configuracion')
      .update(payload)
      .eq('id', 1);

    if (error) throw error;
    inp.value = '';
    showNotification("Elemento añadido correctamente.");
    await cargarDatosDesdeSupabase();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function eliminarElementoConfig(campoSql, index) {
  if (!confirm("¿Deseas remover este parámetro de la configuración?")) return;

  let arrayActual = [];
  if (campoSql === 'pipeline_etapas') arrayActual = [...PIPELINE_ETAPAS];
  if (campoSql === 'productos') arrayActual = [...PRODUCTOS];
  if (campoSql === 'fuentes') arrayActual = [...FUENTES];
  if (campoSql === 'ejecutives') arrayActual = [...EJECUTIVOS];

  arrayActual.splice(index, 1);

  try {
    const payload = {};
    payload[campoSql] = arrayActual;

    const { error } = await _supabase
      .from('configuracion')
      .update(payload)
      .eq('id', 1);

    if (error) throw error;
    showNotification("Elemento removido.");
    await cargarDatosDesdeSupabase();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function agregarUsuarioConfig() {
  const nameInp = document.getElementById('add-user-name');
  const passInp = document.getElementById('add-user-pass');
  const user = nameInp.value.trim();
  const pass = passInp.value.trim();

  if (!user || !pass) return alert("Completa usuario y contraseña.");

  const nuevosAdmins = [...ADMINS, { user, pass }];

  try {
    const { error } = await _supabase
      .from('configuracion')
      .update({ admins: nuevosAdmins })
      .eq('id', 1);

    if (error) throw error;
    nameInp.value = '';
    passInp.value = '';
    showNotification("Usuario registrado con éxito.");
    await cargarDatosDesdeSupabase();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function eliminarUsuarioConfig(index) {
  if (!confirm("¿Remover el acceso para este usuario?")) return;
  const nuevosAdmins = [...ADMINS];
  nuevosAdmins.splice(index, 1);

  try {
    const { error } = await _supabase
      .from('configuracion')
      .update({ admins: nuevosAdmins })
      .eq('id', 1);

    if (error) throw error;
    showNotification("Usuario eliminado.");
    await cargarDatosDesdeSupabase();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ─── RENDIMIENTO Y CÁLCULOS DEL DASHBOARD (MÉTRICAS) ──────────────────────────
function renderDashboardKPIs(leads) {
  const totalLeads = leads.length;
  
  let montoTotalPipeline = 0;
  let leadsActivos = 0;
  let leadsCerradosGanados = 0;

  leads.forEach(l => {
    const m = parseFloat(l.monto) || 0;
    if (l.estado === 'Cerrado Ganado') {
      leadsCerradosGanados++;
      montoTotalPipeline += m; 
    } else if (l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado') {
      leadsActivos++;
      montoTotalPipeline += m;
    }
  });

  const tasaConversion = totalLeads > 0 ? ((leadsCerradosGanados / totalLeads) * 100).toFixed(1) : 0;
  const divisa = document.getElementById('cfg-moneda') ? document.getElementById('cfg-moneda').value : 'MXN';

  const grid = document.getElementById('dashboard-kpis');
  if (!grid) return;

  grid.innerHTML = `
    <div class="kpi">
      <div class="kpi-label">Prospectos Totales</div>
      <div class="kpi-val blue">${totalLeads}</div>
      <div class="kpi-sub">Registrados en total</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Valor del Pipeline</div>
      <div class="kpi-val green">$${montoTotalPipeline.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
      <div class="kpi-sub">Activos + Ganados (${divisa})</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Leads en Proceso</div>
      <div class="kpi-val amber">${leadsActivos}</div>
      <div class="kpi-sub">Negociaciones vivas</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Tasa de Cierre</div>
      <div class="kpi-val">${tasaConversion}%</div>
      <div class="kpi-sub">Ganados vs Totales</div>
    </div>
  `;
}

// RENDERIZADO GRÁFICO PERSONALIZADO (BAR-CHARTS HTML/CSS)
function renderDashboardCharts(leads) {
  const chartEtapas = document.getElementById('chart-etapas');
  if (chartEtapas) {
    const montosPorEtapa = {};
    PIPELINE_ETAPAS.forEach(e => montosPorEtapa[e] = 0);
    
    let maxMonto = 0;
    leads.forEach(l => {
      const e = l.estado || 'Nuevo';
      const m = parseFloat(l.monto) || 0;
      if (montosPorEtapa[e] !== undefined) {
        montosPorEtapa[e] += m;
      } else {
        montosPorEtapa[e] = m;
      }
    });

    Object.values(montosPorEtapa).forEach(v => { if (v > maxMonto) maxMonto = v; });

    let html = '';
    Object.keys(montosPorEtapa).forEach(etapa => {
      const monto = montosPorEtapa[etapa];
      const pct = maxMonto > 0 ? (monto / maxMonto) * 100 : 0;
      html += `
        <div class="bar-row">
          <div class="bar-label" title="${etapa}">${etapa}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%; background: var(--green);"></div>
          </div>
          <div class="bar-count" style="width:70px; font-size:11px;">$${monto.toLocaleString('es-MX')}</div>
        </div>
      `;
    });
    chartEtapas.innerHTML = html || '<div class="empty">Sin datos suficientes</div>';
  }

  const chartFuentes = document.getElementById('chart-fuentes');
  if (chartFuentes) {
    const conteoFuentes = {};
    FUENTES.forEach(f => conteoFuentes[f] = 0);
    conteoFuentes['No Especificado'] = 0;

    let maxCant = 0;
    leads.forEach(l => {
      const f = l.fuente || 'No Especificado';
      if (conteoFuentes[f] !== undefined) conteoFuentes[f]++;
      else conteoFuentes[f] = 1;
    });

    Object.values(conteoFuentes).forEach(v => { if (v > maxCant) maxCant = v; });

    let html = '';
    Object.keys(conteoFuentes).forEach(f => {
      const cant = conteoFuentes[f];
      if (cant === 0 && f === 'No Especificado') return; 
      const pct = maxCant > 0 ? (cant / maxCant) * 100 : 0;
      html += `
        <div class="bar-row">
          <div class="bar-label" title="${f}">${f}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%; background: #185fa5;"></div>
          </div>
          <div class="bar-count">${cant}</div>
        </div>
      `;
    });
    chartFuentes.innerHTML = html || '<div class="empty">Sin datos suficientes</div>';
  }
}

// ─── RENDERIZADO Y CONTROL DE LA TABLA DE LEADS ───────────────────────────────
function renderTableLeads(leads) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No se encontraron leads con los criterios seleccionados.</td></tr>`;
    return;
  }

  leads.forEach(l => {
    const tr = document.createElement('tr');
    tr.onclick = () => abrirPanelEditar(l);

    const inicial = l.nombre ? l.nombre.charAt(0).toUpperCase() : '?';
    const montoNum = parseFloat(l.monto) || 0;
    const divisa = document.getElementById('cfg-moneda') ? document.getElementById('cfg-moneda').value : 'MXN';

    let badgeClass = 'b-nuevo';
    const est = (l.estado || 'Nuevo').toLowerCase();
    if (est.includes('nuevo')) badgeClass = 'b-nuevo';
    else if (est.includes('contactado')) badgeClass = 'b-contactado';
    else if (est.includes('calificado')) badgeClass = 'b-calificado';
    else if (est.includes('propuesta')) badgeClass = 'b-propuesta';
    else if (est.includes('negociación') || est.includes('negociacion')) badgeClass = 'b-negociacion';
    else if (est.includes('ganado') || est.includes('cerrado ganado')) badgeClass = 'b-cerrado';
    else if (est.includes('perdido') || est.includes('cerrado perdido')) badgeClass = 'b-perdido';
    else if (est.includes('abandonado')) badgeClass = 'b-abandonado';

    let badgePrio = 'b-media';
    const prio = (l.prioridad || 'Media').toLowerCase();
    if (prio === 'alta') badgePrio = 'b-alta';
    if (prio === 'baja') badgePrio = 'b-baja';

    let cleanPhone = l.telefono ? l.telefono.replace(/\D/g, '') : '';
    let waHtml = '—';
    if (cleanPhone) {
      if (cleanPhone.length === 10) cleanPhone = '52' + cleanPhone;
      waHtml = `
        <a class="wa-link" href="https://wa.me/${cleanPhone}" target="_blank" onclick="event.stopPropagation();">
          <i class="ti ti-brand-whatsapp"></i> ${l.telefono}
        </a>
      `;
    }

    let fechaSegStr = '—';
    if (l.proximoseg) {
      const fSeg = new Date(l.proximoseg);
      if (!isNaN(fSeg.getTime())) {
        fechaSegStr = fSeg.toLocaleDateString('es-MX') + ' ' + fSeg.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      }
    }

    tr.innerHTML = `
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="avatar">${inicial}</div>
          <div>
            <div class="td-name">${l.nombre || 'Sin Nombre'}</div>
            <div class="td-muted">${l.empresa || 'Particular'}</div>
          </div>
        </div>
      </td>
      <td>
        <div>${waHtml}</div>
        <div class="td-muted" style="font-size:11px;">${l.correo || 'Sin correo'}</div>
      </td>
      <td>
        <strong>$${montoNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
        <div class="td-muted">${l.producto || 'No seleccionado'}</div>
      </td>
      <td>
        <span style="font-size:12px;">${l.fuente || 'Desconocido'}</span>
      </td>
      <td>
        <div style="font-size:12px;">${l.ejecutivo || 'Sin Asignar'}</div>
        <div class="td-muted" style="font-size:10px;">${l.responsable || 'Sin Área'}</div>
      </td>
      <td>
        <span class="badge ${badgeClass}">${l.estado || 'Nuevo'}</span>
        <span class="badge ${badgePrio}" style="margin-left:4px; font-size:9px; padding:1px 5px;">${l.prioridad || 'Media'}</span>
      </td>
      <td style="font-size:12px; font-weight:500;">
        ${fechaSegStr}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// FILTRADO DINÁMICO EN TIEMPO REAL
function filtrarLeads() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const fEtapa = document.getElementById('filter-etapa').value;
  const fFuente = document.getElementById('filter-fuente').value;
  const fEjecutivo = document.getElementById('filter-ejecutivo').value;

  const filtrados = LEADS_GLOBAL.filter(l => {
    const matchQuery = (l.nombre || '').toLowerCase().includes(query) ||
                       (l.empresa || '').toLowerCase().includes(query) ||
                       (l.telefono || '').includes(query) ||
                       (l.notas || '').toLowerCase().includes(query);

    const matchEtapa = fEtapa === '' || l.estado === fEtapa;
    const matchFuente = fFuente === '' || l.fuente === fFuente;
    const matchEjecutivo = fEjecutivo === '' || l.ejecutivo === fEjecutivo;

    return matchQuery && matchEtapa && matchFuente && matchEjecutivo;
  });

  renderTableLeads(filtrados);
  
  const lbl = document.getElementById('leads-count');
  if (lbl) lbl.innerText = `Mostrando: ${filtrados.length} leads`;
}

// ─── CONTROL DE LA PESTAÑA DE SEGUIMIENTOS AGENDADOS ───────────────────────────
function cargarSeguimientosInterfaz(leads) {
  const tAtrasados = document.getElementById('table-seg-atrasados');
  const tFuturos = document.getElementById('table-seg-futuros');

  if (!tAtrasados || !tFuturos) return;

  tAtrasados.innerHTML = '';
  tFuturos.innerHTML = '';

  const ahora = new Date();
  let countAtrasados = 0;
  let countFuturos = 0;

  leads.forEach(l => {
    if (!l.proximoseg) return; 
    
    // Ignorar cerrados o descartados de la lista activa de seguimientos
    if (l.estado === 'Cerrado Ganado' || l.estado === 'Cerrado Perdido' || l.estado === 'Abandonado') return;

    const fSeg = new Date(l.proximoseg);
    if (isNaN(fSeg.getTime())) return;

    const tr = document.createElement('tr');
    tr.onclick = () => abrirPanelEditar(l);

    let cleanPhone = l.telefono ? l.telefono.replace(/\D/g, '') : '';
    let waHtml = '—';
    if (cleanPhone) {
      if (cleanPhone.length === 10) cleanPhone = '52' + cleanPhone;
      waHtml = `<a class="wa-link" href="https://wa.me/${cleanPhone}" target="_blank" onclick="event.stopPropagation();"><i class="ti ti-brand-whatsapp"></i> ${l.telefono}</a>`;
    }

    const fechaFormateada = fSeg.toLocaleDateString('es-MX') + ' ' + fSeg.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    tr.innerHTML = `
      <td><strong>${l.nombre || 'Sin Nombre'}</strong><div style="font-size:11px; color:var(--text2);">${l.empresa || 'Particular'}</div></td>
      <td>${waHtml}</td>
      <td>${l.producto || '—'}<div style="font-size:11px; color:var(--text3);">$${(parseFloat(l.monto)||0).toLocaleString('es-MX')}</div></td>
      <td><span style="font-size:12px;">${l.ejecutivo || 'Sin ejecutivo'}</span></td>
      <td><span style="font-weight:600;">${fechaFormateada}</span></td>
      <td><div style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px;" title="${l.notas||''}">${l.notas || 'Sin notas.'}</div></td>
    `;

    if (fSeg < ahora) {
      tAtrasados.appendChild(tr);
      countAtrasados++;
    } else {
      tFuturos.appendChild(tr);
      countFuturos++;
    }
  });

  if (countAtrasados === 0) {
    tAtrasados.innerHTML = `<tr><td colspan="6" class="empty" style="color:var(--green);"><i class="ti ti-circle-check"></i> ¡Excelente! No tienes ningún seguimiento atrasado.</td></tr>`;
  }
  if (countFuturos === 0) {
    tFuturos.innerHTML = `<tr><td colspan="6" class="empty">No hay próximos seguimientos agendados en el sistema.</td></tr>`;
  }
}

// ─── APERTURA Y EDICIÓN DE LEADS (MODAL CRUD) ──────────────────────────────────
function abrirPanelNuevo() {
  document.getElementById('panel-title-text').innerText = "Nuevo Lead / Registro";
  document.getElementById('n-id').value = '';
  
  document.getElementById('n-nombre').value = '';
  document.getElementById('n-empresa').value = '';
  document.getElementById('n-telefono').value = '';
  document.getElementById('n-correo').value = '';
  document.getElementById('n-estado-geo').value = '';
  document.getElementById('n-pais').value = 'México';
  
  document.getElementById('n-fuente').value = '';
  document.getElementById('n-producto').value = '';
  document.getElementById('n-presupuesto').value = '';
  document.getElementById('n-monto').value = 0;
  document.getElementById('n-responsable').value = '';
  document.getElementById('n-ejecutivo').value = '';
  document.getElementById('n-prioridad').value = 'Media';
  document.getElementById('n-situacion').value = PIPELINE_ETAPAS[0] || '';
  document.getElementById('n-seg').value = '';
  document.getElementById('n-notas').value = '';

  const btnDel = document.getElementById('btn-delete-lead');
  if (btnDel) btnDel.style.display = 'none';

  togglePanel(true);
}

function abrirPanelEditar(lead) {
  document.getElementById('panel-title-text').innerText = "Expediente y Modificación de Lead";
  document.getElementById('n-id').value = lead.id;
  
  document.getElementById('n-nombre').value = lead.nombre || '';
  document.getElementById('n-empresa').value = lead.empresa || '';
  document.getElementById('n-telefono').value = lead.telefono || '';
  document.getElementById('n-correo').value = lead.correo || '';
  document.getElementById('n-estado-geo').value = lead.estado_geo || '';
  document.getElementById('n-pais').value = lead.pais || 'México';
  
  document.getElementById('n-fuente').value = lead.fuente || '';
  document.getElementById('n-producto').value = lead.producto || '';
  document.getElementById('n-presupuesto').value = lead.presupuesto || '';
  document.getElementById('n-monto').value = lead.monto || 0;
  document.getElementById('n-responsable').value = lead.responsable || '';
  document.getElementById('n-ejecutivo').value = lead.ejecutivo || '';
  document.getElementById('n-prioridad').value = lead.prioridad || 'Media';
  document.getElementById('n-situacion').value = lead.estado || 'Nuevo';
  
  if (lead.proximoseg) {
    const localDate = new Date(lead.proximoseg);
    if (!isNaN(localDate.getTime())) {
      consttzOffset = localDate.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(localDate.getTime() - consttzOffset)).toISOString().slice(0, 16);
      document.getElementById('n-seg').value = localISOTime;
    } else {
      document.getElementById('n-seg').value = '';
    }
  } else {
    document.getElementById('n-seg').value = '';
  }
  
  document.getElementById('n-notas').value = lead.notas || '';

  const btnDel = document.getElementById('btn-delete-lead');
  if (btnDel) btnDel.style.display = 'inline-flex';

  togglePanel(true);
}

// ACCIÓN DE INSERCIÓN O ACTUALIZACIÓN EN SUPABASE
async function guardarLeadSupabase() {
  const id = document.getElementById('n-id').value;
  const nombre = document.getElementById('n-nombre').value.trim();
  
  if (!nombre) return alert("El nombre del cliente es un campo obligatorio.");

  const fSegValue = document.getElementById('n-seg').value;
  let proximosegISO = null;
  if (fSegValue) {
    const d = new Date(fSegValue);
    if (!isNaN(d.getTime())) proximosegISO = d.toISOString();
  }

  const payload = {
    nombre: nombre,
    empresa: document.getElementById('n-empresa').value.trim(),
    telefono: document.getElementById('n-telefono').value.trim(),
    correo: document.getElementById('n-correo').value.trim(),
    estado_geo: document.getElementById('n-estado-geo').value.trim(),
    pais: document.getElementById('n-pais').value.trim(),
    fuente: document.getElementById('n-fuente').value,
    producto: document.getElementById('n-producto').value,
    presupuesto: document.getElementById('n-presupuesto').value,
    monto: parseFloat(document.getElementById('n-monto').value) || 0,
    responsable: document.getElementById('n-responsable').value,
    ejecutivo: document.getElementById('n-ejecutivo').value,
    prioridad: document.getElementById('n-prioridad').value,
    estado: document.getElementById('n-situacion').value,
    proximoseg: proximosegISO,
    notas: document.getElementById('n-notas').value.trim(),
    fechaactualizacion: new Date().toISOString()
  };

  try {
    if (id) {
      const { error } = await _supabase
        .from('leads')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
      showNotification("Expediente de lead actualizado.");
    } else {
      const { error } = await _supabase
        .from('leads')
        .insert([payload]);
      if (error) throw error;
      showNotification("Nuevo prospecto registrado con éxito.");
    }

    togglePanel(false);
    await cargarDatosDesdeSupabase();
  } catch (err) {
    alert("Error al guardar datos: " + err.message);
  }
}

async function eliminarLeadActual() {
  const id = document.getElementById('n-id').value;
  if (!id) return;
  
  if (!confirm("¿Estás completamente seguro de eliminar permanentemente este registro de lead? Esta acción no se puede deshacer.")) return;

  try {
    const { error } = await _supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
    showNotification("Lead eliminado del CRM.");
    togglePanel(false);
    await cargarDatosDesdeSupabase();
  } catch (err) {
    alert("Error al eliminar: " + err.message);
  }
}

// ─── CONTROL DE NOTIFICACIONES TOAST (UI) ──────────────────────────────────────
function showNotification(msg) {
  const notif = document.getElementById('notif');
  if (!notif) return;
  notif.innerText = msg;
  notif.classList.add('show');
  setTimeout(() => {
    notif.classList.remove('show');
  }, 3500);
}

// ─── LOGIN DE SEGURIDAD EXCLUSIVO ──────────────────────────────────────────────
function handleLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');

  let loginValido = false;

  if (user === AUTH_USER && pass === AUTH_PASS) {
    loginValido = true;
  } else {
    const encontrarUsuario = ADMINS.find(u => u.user === user && u.pass === pass);
    if (encontrarUsuario) loginValido = true;
  }

  if (loginValido) {
    sessionStorage.setItem('crm_logged_in', 'true');
    const container = document.getElementById('login-container');
    if (container) container.style.display = 'none';
    if (errEl) errEl.style.display = 'none';
    showNotification("Acceso autorizado. Sincronizando pipeline...");
  } else {
    if (errEl) errEl.style.display = 'block';
  }
}

// ─── RECORDATORIO DE SEGUIMIENTOS DEL DÍA ──────────────────────────────────────
function verificarSeguimientosHoy(leads) {
  const hoyStr = new Date().toLocaleDateString('es-MX');
  
  const hoyLeads = leads ? leads.filter(l => {
    if (!l.proximoseg) return false;
    const f = new Date(l.proximoseg);
    return f.toLocaleDateString('es-MX') === hoyStr && l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado';
  }) : [];

  if (hoyLeads.length > 0) {
    setTimeout(() => {
      alert(`📢 ¡Recordatorio de Ventas!\nTienes (${hoyLeads.length}) seguimientos agendados para el día de hoy. Por favor, revisa la pestaña de Seguimiento.`);
    }, 1000);
  }
}

// ─── FUNCIÓN PARA MOSTRAR / OCULTAR EL PANEL LATERAL (FALTANTE) ────────────────
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
  if (!e || e.target.id === 'overlay') togglePanel(false);
}

// ─── INICIALIZADOR DEL CRM ────────────────────────────────────────────────────
window.onload = async function() {
  await cargarDatosDesdeSupabase();

  if (sessionStorage.getItem('crm_logged_in') === 'true') {
    const container = document.getElementById('login-container');
    if (container) container.style.display = 'none';
  }
}
