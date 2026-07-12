// ─── CONFIGURACIÓN DE CONEXIÓN CON SUPABASE ───────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// CREDENCIALES EXCLUSIVAS ACTUALIZADAS
const AUTH_USER = "Herbolaria";
const AUTH_PASS = "Saludable*"; 

// Arreglos globales dinámicos que se sincronizan con Supabase
let ADMINS = [];
let FUENTES = [];
let PRODUCTOS = [];
let PRESUPUESTOS = [];
let PIPELINE_ETAPAS = [];

let RESPONSABLES = ['Marketing Digital', 'Ventas Online', 'Gerencia de Ventas', 'Gerencia General'];
let EJECUTIVOS = [
  "Pilar Gonzalez - marketing digital",
  "Ana Maria Alonso - Ventas Online",
  "Yessica Carrillo - Gerencia de Ventas (Ventas Mayoreo)",
  "Emmanuel Zúñiga - Gerencia General"
];

let LEADS = [];
let currentEditingLeadId = null; 

// ─── SISTEMA DE AUTENTICACIÓN (LOGIN ORIGINAL) ─────────────────────────────────
function handleLogin() {
  const u = document.getElementById('login-user').value;
  const p = document.getElementById('login-pass').value;
  
  const masterMatch = (u === AUTH_USER && p === AUTH_PASS);
  const extraMatch = ADMINS.some(admin => admin.user === u && admin.pass === p);

  if (masterMatch || extraMatch) {
    sessionStorage.setItem('crm_logged_in', 'true');
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    
    // Renderizado estructurado inicial
    renderDashboard();
    verificarSeguimientosHoy(LEADS);
  } else {
    const err = document.getElementById('login-error');
    err.style.display = 'block';
    setTimeout(() => { err.style.display = 'none'; }, 5000);
  }
}

function handleLogout() {
  sessionStorage.removeItem('crm_logged_in');
  window.location.reload();
}

// ─── CONTROL DE CAMBIO DE PESTAÑAS (MÉTODO ORIGINAL ORIGINAL '0') ───────────────
function switchTab(tabName, element) {
  const tabs = ['dashboard', 'leads', 'seguimiento', 'config'];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.style.display = (t === tabName) ? 'block' : 'none';
  });
  
  if (element) {
    const allTabs = element.parentElement.querySelectorAll('.tab');
    allTabs.forEach(t => t.classList.remove('active'));
    element.classList.add('active');
  }

  // Desencadenar renderizado oportuno
  if (tabName === 'dashboard') renderDashboard();
  if (tabName === 'leads') renderLeadsTable();
  if (tabName === 'seguimiento') renderSeguimientoTab();
  if (tabName === 'config') renderConfigTab();
}

// ─── SYNC SUPABASE DATA ───────────────────────────────────────────────────────
async function cargarDatosDesdeSupabase() {
  try {
    const { data: configData } = await _supabase.from('crm_config').select('*');
    if (configData) {
      FUENTES = configData.filter(c => c.tipo === 'fuentes').map(c => c.valor);
      PRODUCTOS = configData.filter(c => c.tipo === 'productos').map(c => c.valor);
      PRESUPUESTOS = configData.filter(c => c.tipo === 'presupuestos').map(c => c.valor);
      PIPELINE_ETAPAS = configData.filter(c => c.tipo === 'pipeline_etapas').map(c => c.valor);
      ADMINS = configData.filter(c => c.tipo === 'admins').map(c => JSON.parse(c.valor));
    }

    const { data: leadsData } = await _supabase.from('crm_leads').select('*').order('created_at', { ascending: false });
    LEADS = leadsData || [];
    
    actualizarSelectsFormulario();
  } catch (err) {
    console.error("Error cargando base remota Supabase:", err);
  }
}

function actualizarSelectsFormulario() {
  const f = document.getElementById('n-fuente');
  const p = document.getElementById('n-producto');
  const b = document.getElementById('n-presupuesto');
  const s = document.getElementById('n-situacion');
  const r = document.getElementById('n-responsable');
  const e = document.getElementById('n-ejecutivo');

  if(f) f.innerHTML = FUENTES.map(x => `<option value="${x}">${x}</option>`).join('');
  if(p) p.innerHTML = PRODUCTOS.map(x => `<option value="${x}">${x}</option>`).join('');
  if(b) b.innerHTML = PRESUPUESTOS.map(x => `<option value="${x}">${x}</option>`).join('');
  if(s) s.innerHTML = PIPELINE_ETAPAS.map(x => `<option value="${x}">${x}</option>`).join('');
  if(r) r.innerHTML = RESPONSABLES.map(x => `<option value="${x}">${x}</option>`).join('');
  if(e) e.innerHTML = EJECUTIVOS.map(x => `<option value="${x}">${x}</option>`).join('');
}

// ─── PANEL LATERAL INTERACTIVO (MÉTODO ORIGINAL '0') ──────────────────────────
function openNewLead() {
  currentEditingLeadId = null;
  document.getElementById('panel-title').innerText = "Nuevo Lead";
  document.getElementById('btn-delete-lead').style.display = 'none';
  
  document.getElementById('n-nombre').value = '';
  document.getElementById('n-empresa').value = '';
  document.getElementById('n-tel').value = '';
  document.getElementById('n-correo').value = '';
  document.getElementById('n-monto').value = '';
  document.getElementById('n-seg').value = '';
  document.getElementById('n-notas').value = '';

  document.getElementById('overlay').classList.add('active');
  document.getElementById('panel').classList.add('active');
}

function openEditLead(id) {
  const lead = LEADS.find(l => l.id === id || l.id.toString() === id.toString());
  if (!lead) return;

  currentEditingLeadId = lead.id;
  document.getElementById('panel-title').innerText = "Editar Lead";
  document.getElementById('btn-delete-lead').style.display = 'block';

  document.getElementById('n-nombre').value = lead.nombre || '';
  document.getElementById('n-empresa').value = lead.empresa || '';
  document.getElementById('n-tel').value = lead.telefono || '';
  document.getElementById('n-correo').value = lead.correo || '';
  document.getElementById('n-fuente').value = lead.fuente || '';
  document.getElementById('n-producto').value = lead.producto || '';
  document.getElementById('n-monto').value = lead.monto || '';
  document.getElementById('n-presupuesto').value = lead.presupuesto || '';
  document.getElementById('n-responsable').value = lead.responsable || '';
  document.getElementById('n-ejecutivo').value = lead.ejecutivo || '';
  document.getElementById('n-prioridad').value = lead.prioridad || 'Media';
  document.getElementById('n-situacion').value = lead.estado || '';
  document.getElementById('n-seg').value = lead.proximoseg || '';
  document.getElementById('n-notas').value = lead.notas || '';

  document.getElementById('overlay').classList.add('active');
  document.getElementById('panel').classList.add('active');
}

function closePanel(e) {
  if (!e || e.target.id === 'overlay' || e.currentTarget.classList.contains('panel-close') || e.target.classList.contains('ti-x')) {
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('panel').classList.remove('active');
  }
}

// ─── GUARDAR Y ACTUALIZAR FORMULARIO (MÉTODO SUPABASE) ────────────────────────
async function guardarLeadFormulario() {
  const nombre = document.getElementById('n-nombre').value.trim();
  if (!nombre) { alert('El nombre del prospecto es obligatorio.'); return; }

  const payload = {
    nombre,
    empresa: document.getElementById('n-empresa').value.trim(),
    telefono: document.getElementById('n-tel').value.trim(),
    correo: document.getElementById('n-correo').value.trim(),
    fuente: document.getElementById('n-fuente').value,
    producto: document.getElementById('n-producto').value,
    monto: parseFloat(document.getElementById('n-monto').value) || 0,
    presupuesto: document.getElementById('n-presupuesto').value,
    responsable: document.getElementById('n-responsable').value,
    ejecutivo: document.getElementById('n-ejecutivo').value,
    prioridad: document.getElementById('n-prioridad').value,
    estado: document.getElementById('n-situacion').value,
    proximoseg: document.getElementById('n-seg').value || null,
    notas: document.getElementById('n-notas').value.trim()
  };

  if (currentEditingLeadId) {
    const { error } = await _supabase.from('crm_leads').update(payload).eq('id', currentEditingLeadId);
    if(error) alert("Error actualizando lead: " + error.message);
  } else {
    const { error } = await _supabase.from('crm_leads').insert([payload]);
    if(error) alert("Error insertando lead: " + error.message);
  }

  await cargarDatosDesdeSupabase();
  closePanel();
  
  // Refrescar vista activa
  if (document.getElementById('tab-dashboard').style.display === 'block') renderDashboard();
  else renderLeadsTable();
}

async function eliminarLeadActual() {
  if (!currentEditingLeadId) return;
  if (!confirm("¿Estás completamente seguro de eliminar este prospecto del CRM?")) return;

  const { error } = await _supabase.from('crm_leads').delete().eq('id', currentEditingLeadId);
  if (error) alert("Error al eliminar de Supabase: " + error.message);

  await cargarDatosDesdeSupabase();
  closePanel();
  if (document.getElementById('tab-dashboard').style.display === 'block') renderDashboard();
  else renderLeadsTable();
}

// ─── RENDERS DE INTERFAZ ORIGINAL COMPLETA ─────────────────────────────────────

// 1. RENDEREADO DEL DASHBOARD (GRÁFICOS CSS NATIVOS)
function renderDashboard() {
  const dash = document.getElementById('tab-dashboard');
  if(!dash) return;

  let totalMonto = 0;
  let activos = 0;
  let cerradosGanados = 0;

  LEADS.forEach(l => {
    totalMonto += (l.monto || 0);
    if (l.estado === 'Cerrado Ganado') cerradosGanados++;
    if (l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado') activos++;
  });

  // Agrupamiento Comercial
  const porEtapa = {};
  PIPELINE_ETAPAS.forEach(e => porEtapa[e] = 0);
  LEADS.forEach(l => { if(porEtapa[l.estado] !== undefined) porEtapa[l.estado] += (l.monto || 0); });

  const porFuente = {};
  FUENTES.forEach(f => porFuente[f] = 0);
  LEADS.forEach(l => { if(porFuente[l.fuente] !== undefined) porFuente[l.fuente]++; });

  let maxEtapa = Math.max(...Object.values(porEtapa), 1);
  let maxFuente = Math.max(...Object.values(porFuente), 1);

  dash.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Pipeline Total Estimado</div>
        <div class="kpi-val blue">$${totalMonto.toLocaleString('es-MX', {minimumFractionDigits:2})}</div>
        <div class="kpi-sub">Valor de toda la base comercial</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Prospectos Activos</div>
        <div class="kpi-val amber">${activos}</div>
        <div class="kpi-sub">En proceso de negociación</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Cierres Exitosos</div>
        <div class="kpi-val green">${cerradosGanados}</div>
        <div class="kpi-sub">Leads Ganados acumulados</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title"><i class="ti ti-chart-pie"></i> Distribución por Etapa (Monto $)</div>
        <div class="bar-chart">
          ${Object.entries(porEtapa).map(([etapa, monto]) => {
            const pct = (monto / maxEtapa) * 100;
            return `
              <div class="bar-row">
                <div class="bar-label" title="${etapa}">${etapa}</div>
                <div class="bar-track"><div class="bar-fill" style="width: ${pct}%; background:#185fa5;"></div></div>
                <div class="bar-count">$${monto.toLocaleString('es-MX')}</div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-title"><i class="ti ti-filter"></i> Origen de Prospectos (Cantidad)</div>
        <div class="bar-chart">
          ${Object.entries(porFuente).map(([fuente, cant]) => {
            const pct = (cant / maxFuente) * 100;
            return `
              <div class="bar-row">
                <div class="bar-label" title="${fuente}">${fuente}</div>
                <div class="bar-track"><div class="bar-fill" style="width: ${pct}%; background:var(--green);"></div></div>
                <div class="bar-count">${cant} u.</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// 2. RENDEREADO DE LA BASE DE LEADS (TABLA ORIGINAL)
function renderLeadsTable() {
  const container = document.getElementById('tab-leads');
  if(!container) return;

  container.innerHTML = `
    <div class="filters">
      <input type="text" id="search-input" placeholder="Buscar por nombre, empresa o teléfono..." oninput="filtrarLeads()">
      <select id="filter-etapa" onchange="filtrarLeads()">
        <option value="">Todas las etapas</option>
        ${PIPELINE_ETAPAS.map(e => `<option value="${e}">${e}</option>`).join('')}
      </select>
      <select id="filter-fuente" onchange="filtrarLeads()">
        <option value="">Todas las fuentes</option>
        ${FUENTES.map(f => `<option value="${f}">${f}</option>`).join('')}
      </select>
      <span class="count-label" id="leads-count">Mostrando: ${LEADS.length} leads</span>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Prospecto</th>
            <th>Contacto</th>
            <th>Producto e Importe</th>
            <th>Origen Canal</th>
            <th>Asignación</th>
            <th>Estado Pipeline</th>
          </tr>
        </thead>
        <tbody id="table-body"></tbody>
      </table>
    </div>
  `;
  filtrarLeads();
}

function filtrarLeads() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const fEtapa = document.getElementById('filter-etapa').value;
  const fFuente = document.getElementById('filter-fuente').value;

  const filtrados = LEADS.filter(l => {
    const matchQ = !q || (l.nombre || '').toLowerCase().includes(q) || (l.empresa || '').toLowerCase().includes(q) || (l.telefono || '').toLowerCase().includes(q);
    const matchEtapa = !fEtapa || l.estado === fEtapa;
    const matchFuente = !fFuente || l.fuente === fFuente;
    return matchQ && matchEtapa && matchFuente;
  });

  document.getElementById('leads-count').innerText = `Mostrando: ${filtrados.length} leads`;

  const tbody = document.getElementById('table-body');
  if(!tbody) return;

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text3); padding:24px;">No se encontraron prospectos con los filtros activos.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados.map(l => {
    const badgeClass = 'b-' + (l.estado || 'nuevo').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    const waBoton = l.telefono ? `<a href="https://wa.me/${l.telefono.replace(/\D/g,'')}" target="_blank" class="wa-link" onclick="event.stopPropagation()"><i class="ti ti-brand-whatsapp"></i> ${l.telefono}</a>` : '<span style="color:var(--text3)">Sin Teléfono</span>';
    
    return `
      <tr onclick="openEditLead('${l.id}')">
        <td>
          <div class="td-name">
            <div class="avatar">${(l.nombre || 'P').charAt(0).toUpperCase()}</div>
            <div>
              <div>${l.nombre}</div>
              <div class="td-muted">${l.empresa || 'Particular'}</div>
            </div>
          </div>
        </td>
        <td>
          <div>${waBoton}</div>
          <div class="td-muted">${l.correo || 'Sin correo registrado'}</div>
        </td>
        <td>
          <div style="font-weight:500;">$${(l.monto || 0).toLocaleString('es-MX')}</div>
          <div class="td-muted">${l.producto || 'No especificado'}</div>
        </td>
        <td>
          <div><i class="ti ti-share" style="color:var(--text3)"></i> ${l.fuente || 'Directo'}</div>
        </td>
        <td>
          <div>${l.ejecutivo || 'Sin Asignar'}</div>
          <div class="td-muted">${l.responsable || '-'}</div>
        </td>
        <td>
          <span class="badge ${badgeClass}">${l.estado || 'Nuevo'}</span>
        </td>
      </tr>
    `;
  }).join('');
}

// 3. RENDEREADO DE LA PESTAÑA DE SEGUIMIENTOS AGENDADOS
function renderSeguimientoTab() {
  const container = document.getElementById('tab-seguimiento');
  if(!container) return;

  const hoy = new Date();
  hoy.setHours(0,0,0,0);

  const atrasados = [];
  const futuros = [];

  LEADS.forEach(l => {
    if(!l.proximoseg || l.estado === 'Cerrado Ganado' || l.estado === 'Cerrado Perdido' || l.estado === 'Abandonado') return;
    
    const fSeg = new Date(l.proximoseg);
    if(fSeg < hoy) atrasados.push({ lead: l, fecha: fSeg });
    else futuros.push({ lead: l, fecha: fSeg });
  });

  // Ordenar cronológicamente
  atrasados.sort((a,b) => a.fecha - b.fecha);
  futuros.sort((a,b) => a.fecha - b.fecha);

  function mapearFilasSeguimiento(lista) {
    if(lista.length === 0) return `<tr><td colspan="5" style="text-align:center; color:var(--text3); padding:16px;">Sin compromisos en esta sección.</td></tr>`;
    return lista.map(item => {
      const l = item.lead;
      return `
        <tr onclick="openEditLead('${l.id}')">
          <td class="td-name">${l.nombre} <span class="td-muted" style="font-weight:normal; margin-left:6px;">(${l.empresa || 'Particular'})</span></td>
          <td>${l.producto}</td>
          <td>${l.ejecutivo}</td>
          <td style="font-weight:500;">${new Date(l.proximoseg).toLocaleString('es-MX', {dateStyle:'short', timeStyle:'short'})}</td>
          <td class="td-muted" style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${l.notas || ''}">${l.notas || 'Sin anotaciones previas'}</td>
        </tr>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="seg-group">
      <div class="seg-title atrasado"><i class="ti ti-alert-triangle"></i> SEGUIMIENTOS VENCIDOS / ATRASADOS</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Prospecto</th><th>Producto</th><th>Ejecutivo Asignado</th><th>Fecha Programada</th><th>Últimas Notas</th></tr>
          </thead>
          <tbody>${mapearFilasSeguimiento(atrasados)}</tbody>
        </table>
      </div>
    </div>

    <div class="seg-group">
      <div class="seg-title futuro"><i class="ti ti-calendar-check"></i> ACCIONES PROGRAMADAS (HOY Y FUTURAS)</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Prospecto</th><th>Producto</th><th>Ejecutivo Asignado</th><th>Fecha Programada</th><th>Últimas Notas</th></tr>
          </thead>
          <tbody>${mapearFilasSeguimiento(futuros)}</tbody>
        </table>
      </div>
    </div>
  `;
}

// 4. RENDEREADO DE LA PESTAÑA DE CONFIGURACIÓN DINÁMICA
function renderConfigTab() {
  const container = document.getElementById('tab-config');
  if(!container) return;

  container.innerHTML = `
    <div class="config-container">
      <div class="config-box">
        <h3><i class="ti ti-tournament"></i> Etapas del Pipeline de Ventas</h3>
        <div class="config-tags-wrapper">${PIPELINE_ETAPAS.map((e, idx) => `<div class="config-tag">${e} <i class="ti ti-x" onclick="eliminarElementoConfig('pipeline_etapas', '${e}')"></i></div>`).join('')}</div>
        <div class="config-input-group">
          <input type="text" id="add-etapa" placeholder="Ej. Demo Pendiente">
          <button class="btn btn-primary" onclick="agregarElementoConfig('pipeline_etapas', 'add-etapa')">Añadir</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-package"></i> Catálogo de Productos / Servicios</h3>
        <div class="config-tags-wrapper">${PRODUCTOS.map(p => `<div class="config-tag">${p} <i class="ti ti-x" onclick="eliminarElementoConfig('productos', '${p}')"></i></div>`).join('')}</div>
        <div class="config-input-group">
          <input type="text" id="add-producto" placeholder="Nombre del nuevo producto">
          <button class="btn btn-primary" onclick="agregarElementoConfig('productos', 'add-producto')">Añadir</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-share"></i> Orígenes / Canales de Entrada</h3>
        <div class="config-tags-wrapper">${FUENTES.map(f => `<div class="config-tag">${f} <i class="ti ti-x" onclick="eliminarElementoConfig('fuentes', '${f}')"></i></div>`).join('')}</div>
        <div class="config-input-group">
          <input type="text" id="add-fuente" placeholder="Ej. Facebook Reels">
          <button class="btn btn-primary" onclick="agregarElementoConfig('fuentes', 'add-fuente')">Añadir</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-coin"></i> Rangos de Presupuesto Comercial</h3>
        <div class="config-tags-wrapper">${PRESUPUESTOS.map(b => `<div class="config-tag">${b} <i class="ti ti-x" onclick="eliminarElementoConfig('presupuestos', '${b}')"></i></div>`).join('')}</div>
        <div class="config-input-group">
          <input type="text" id="add-presupuesto" placeholder="Ej. $10,000 - $20,000">
          <button class="btn btn-primary" onclick="agregarElementoConfig('presupuestos', 'add-presupuesto')">Añadir</button>
        </div>
      </div>
    </div>
  `;
}

// ─── ACCIONES DE ACTUALIZACIÓN EN CONFIGURACIÓN (CON SUPABASE) ──────────────────
async function agregarElementoConfig(tipo, inputId) {
  const input = document.getElementById(inputId);
  const valor = input.value.trim();
  if(!valor) return;

  const { error } = await _supabase.from('crm_config').insert([{ tipo, valor }]);
  if(error) alert("Error al guardar configuración: " + error.message);

  input.value = '';
  await cargarDatosDesdeSupabase();
  renderConfigTab();
}

async function eliminarElementoConfig(tipo, valor) {
  if(!confirm(`¿Deseas remover "${valor}" de las opciones de configuración?`)) return;

  const { error } = await _supabase.from('crm_config').delete().eq('tipo', tipo).eq('valor', valor);
  if(error) alert("Error al eliminar configuración: " + error.message);

  await cargarDatosDesdeSupabase();
  renderConfigTab();
}

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

// ─── INICIALIZADOR EXCLUSIVO DEL CRM ──────────────────────────────────────────
window.onload = async function() {
  await cargarDatosDesdeSupabase();

  if (sessionStorage.getItem('crm_logged_in') === 'true') {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    renderDashboard();
    verificarSeguimientosHoy(LEADS);
  }
};
