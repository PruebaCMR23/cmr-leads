// ─── CONFIGURACIÓN DE CONEXIÓN CON SUPABASE ───────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// CREDENCIALES EXCLUSIVAS ACTUALIZADAS
const AUTH_USER = "Herbolaria";
const AUTH_PASS = "Saludable*";

// Lista dinámica de administradores adicionales (se guardará en Storage)
let ADMINS = JSON.parse(localStorage.getItem('cfg_admins')) || [];
let editingAdminIndex = null; // Controla si se está editando un administrador existente

// ARRAYS EDITABLES CON SUS DATOS ORIGINALES TOTALMENTE RESTAURADOS
let FUENTES = JSON.parse(localStorage.getItem('cfg_fuentes')) || [
  'Meta Ads (Facebook/Instagram)',
  'WhatsApp Business Directo',
  'Sitio Web Orgánico',
  'Google Ads',
  'TikTok Shop / Organic',
  'Recomendación / Boca en Boca',
  'Marketplace (Mercado Libre/Amazon)'
];

let PRODUCTOS = JSON.parse(localStorage.getItem('cfg_productos')) || [
  'Kit Distribuidor Inicial',
  'Lote Mayorista Extractos (Goteros)',
  'Suplementos Cápsulas Premium',
  'Línea Cosmética Herbal',
  'Materia Prima a Granel',
  'Asesoría / Maquila de Marca',
  'Muestras Comerciales'
];

let PRESUPUESTOS = JSON.parse(localStorage.getItem('cfg_presupuestos')) || [
  'Menos de $5,000 MXN',
  '$5,000 - $15,000 MXN',
  '$15,000 - $50,000 MXN',
  'Más de $50,000 MXN',
  'Volumen Especial (Cotización)'
];

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

// Arreglo maestro de LEADS que se sincronizará con la Base de Datos
let LEADS = [];

let currentEditId = null;

// Filtros globales para la vista Dashboard
let filterSearch = '';
let filterEstado = 'Todos';
let filterEjecutivo = 'Todos';
let currentDashboardViewMode = 'table'; // 'table' o 'kanban'

// ─── CONSULTAS ASÍNCRONAS A SUPABASE ──────────────────────────────────────────
async function fetchLeadsFromSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    LEADS = data || [];
    
    // Una vez obtenidos los datos, disparamos tus renders nativos
    verificarYRenderizarTodo();
  } catch (err) {
    console.error('Error al descargar leads:', err.message);
    notify('❌ Error al conectar con Supabase', 'danger');
  }
}

// Escucha en tiempo real para cambios remotos
function subscribeToLeadsRealtime() {
  supabaseClient
    .channel('schema-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
      fetchLeadsFromSupabase();
    })
    .subscribe();
}

// ─── FUNCIONES ORIGINALES DE CONTROL DE PANELES Y TABS ─────────────────────────
function switchTab(tabId, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');

  ['dashboard', 'leads', 'seguimiento', 'reportes', 'config'].forEach(id => {
    const target = document.getElementById(`tab-${id}`);
    if (target) {
      target.style.display = (id === tabId) ? 'block' : 'none';
    }
  });
  verificarYRenderizarTodo();
}

function togglePanel(state) {
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('panel');
  if (state) {
    overlay.classList.add('active');
    panel.classList.add('active');
  } else {
    overlay.classList.remove('active');
    panel.classList.remove('active');
    currentEditId = null;
  }
}

function closePanel(e) {
  if (e.target.id === 'overlay') {
    togglePanel(false);
  }
}

// ─── AUTENTICACIÓN ────────────────────────────────────────────────────────────
function handleLogin() {
  const userVal = document.getElementById('login-user').value.trim();
  const passVal = document.getElementById('login-pass').value;
  const errorMsg = document.getElementById('login-error');

  const isPrimary = (userVal.toLowerCase() === AUTH_USER.toLowerCase() && passVal === AUTH_PASS);
  const isExtra = ADMINS.some(admin => admin.user.toLowerCase() === userVal.toLowerCase() && admin.pass === passVal);

  if (isPrimary || isExtra) {
    errorMsg.style.display = 'none';
    sessionStorage.setItem('crm_logged_in', 'true');
    sessionStorage.setItem('crm_user_role', isPrimary ? 'Primary' : 'SubAdmin');
    
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    
    fetchLeadsFromSupabase();
    subscribeToLeadsRealtime();
  } else {
    errorMsg.innerText = "Usuario o contraseña inválidos. Revisa tus credenciales.";
    errorMsg.style.display = "block";
  }
}

// Mantiene exactamente la lógica original de inicio
function handleLogout() {
  sessionStorage.clear();
  window.location.reload();
}

function checkPasswordPrompt(actionName) {
  const role = sessionStorage.getItem('crm_user_role');
  if (role === 'Primary') return true; 

  const promptPass = prompt(`⚠️ Seguridad obligatoria: Introduce la contraseña de la cuenta maestra ("${AUTH_USER}") para proceder con: \n[${actionName}]`);
  if (promptPass === AUTH_PASS) return true;
  
  alert('❌ Acción rechazada: Credencial incorrecta o no tienes privilegios suficientes.');
  return false;
}

// ─── RENDERIZADORES DE VISTAS (ESTRUCTURA ORIGINAL INTACTA) ───────────────────
function verificarYRenderizarTodo() {
  if (document.getElementById('tab-dashboard').style.display !== 'none') {
    renderDashboard();
  }
  if (document.getElementById('tab-leads').style.display !== 'none') {
    renderLeadsTab();
  }
  if (document.getElementById('tab-seguimiento').style.display !== 'none') {
    renderSeguimientoTab();
  }
  if (document.getElementById('tab-reportes').style.display !== 'none') {
    renderReportesTab();
  }
  if (document.getElementById('tab-config').style.display !== 'none') {
    renderConfig();
  }
}

function renderDashboard() {
  const container = document.getElementById('tab-dashboard');
  if (!container) return;

  let filteredLeads = LEADS.filter(lead => {
    const term = filterSearch.toLowerCase();
    const matchesText = (lead.nombre || '').toLowerCase().includes(term) || 
                        (lead.empresa || '').toLowerCase().includes(term) ||
                        (lead.notasventas || '').toLowerCase().includes(term);
    
    const matchesEstado = (filterEstado === 'Todos' || lead.estadolead === filterEstado);
    const matchesEjecutivo = (filterEjecutivo === 'Todos' || lead.ejecutivo === filterEjecutivo);

    return matchesText && matchesEstado && matchesEjecutivo;
  });

  const totalLeads = filteredLeads.length;
  const nuevosLeads = filteredLeads.filter(l => l.estadolead === 'Nuevo').length;
  const montoPotencial = filteredLeads.reduce((acc, curr) => acc + (Number(curr.montopotencial) || 0), 0);
  const montoCerrado = filteredLeads.reduce((acc, curr) => acc + (Number(curr.montocerrado) || 0), 0);

  let ejecutivoOptions = `<option value="Todos">Todos los Ejecutivos</option>`;
  EJECUTIVOS.forEach(ej => {
    ejecutivoOptions += `<option value="${ej}" ${filterEjecutivo === ej ? 'selected' : ''}>${ej.split(' - ')[0]}</option>`;
  });

  const estados = ['Todos', 'Nuevo', 'En Seguimiento', 'Demostración / Muestra', 'Negociación', 'Cerrado Ganado', 'Cerrado Perdido'];
  let estadoOptions = '';
  estados.forEach(est => {
    estadoOptions += `<option value="${est}" ${filterEstado === est ? 'selected' : ''}>${est === 'Todos' ? 'Todos los Estados' : est}</option>`;
  });

  let contentHtml = '';
  if (currentDashboardViewMode === 'table') {
    contentHtml = `
      <div class="section-card">
        <div class="table-responsive">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Lead / Empresa</th>
                <th>Contacto Directo</th>
                <th>Ecosistema</th>
                <th>Monto Est.</th>
                <th>Asignación</th>
                <th>Estado</th>
                <th>Última Act.</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLeads.length === 0 ? '<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:30px;">Ningún registro coincide con el criterio actual.</td></tr>' : ''}
              ${filteredLeads.map(lead => `
                <tr>
                  <td><strong>${lead.nombre}</strong><br><span style="font-size:11px;color:var(--text2);">${lead.empresa || 'Sin Empresa'}</span></td>
                  <td>${lead.telefono || '—'}<br><span style="font-size:11px;color:var(--text2);">${lead.correo || '—'}</span></td>
                  <td><span style="font-size:12px;">🌱 ${lead.fuente || 'No definida'}</span><br><span style="font-size:11px;color:var(--text2);">📦 ${lead.producto || 'Sin especificar'}</span></td>
                  <td><strong>$${(Number(lead.montopotencial) || 0).toLocaleString('es-MX')}</strong><br><span style="font-size:11px;color:var(--text2);">Cierre: $${(Number(lead.montocerrado) || 0).toLocaleString('es-MX')}</span></td>
                  <td><span style="font-size:12px;font-weight:500;">${lead.ejecutivo ? lead.ejecutivo.split(' - ')[0] : 'No Asignado'}</span><br><span style="font-size:11px;color:var(--text2);">${lead.responsable || '—'}</span></td>
                  <td><span class="badge ${getBadgeClass(lead.estadolead)}">${lead.estadolead || 'Nuevo'}</span><br><span style="font-size:10px;color:var(--text3);font-weight:bold;">Prio: ${lead.prioridad || 'Media'}</span></td>
                  <td style="font-size:11px;color:var(--text2);">${lead.ultimaactualizacion || '—'}</td>
                  <td><button class="btn btn-secondary" style="padding:4px 8px; font-size:12px;" onclick="openEditLead('${lead.id}')"><i class="ti ti-edit"></i> Gestionar</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    const cols = ['Nuevo', 'En Seguimiento', 'Demostración / Muestra', 'Negociación', 'Cerrado Ganado', 'Cerrado Perdido'];
    contentHtml = `
      <div class="kanban-board">
        ${cols.map(col => {
          const leadsInCol = filteredLeads.filter(l => l.estadolead === col);
          return `
            <div class="kanban-column">
              <div class="kanban-header status-${getColClassSuffix(col)}">${col}</div>
              <div class="kanban-cards-wrapper">
                ${leadsInCol.map(lead => `
                  <div class="kanban-card priority-${(lead.prioridad || 'Media').toLowerCase()}">
                    <div class="k-title">${lead.nombre}</div>
                    <div class="k-subtitle">${lead.empresa || 'Sin Empresa'}</div>
                    <div class="k-details">📦 ${lead.producto || 'No Definido'}</div>
                    <div class="k-footer">
                      <span class="k-price">$${(Number(lead.montopotencial) || 0).toLocaleString('es-MX')}</span>
                      <span class="k-user"><i class="ti ti-user"></i> ${lead.ejecutivo ? lead.ejecutivo.split(' ')[0] : 'S/A'}</span>
                    </div>
                    <div style="margin-top:8px; padding-top:6px; border-top:1px dashed var(--border); text-align:right;">
                      <a href="javascript:void(0)" style="font-size:11px;color:var(--green);text-decoration:none;font-weight:600;" onclick="openEditLead('${lead.id}')">Editar Ficha →</a>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // NUEVOSLEADS CORREGIDO CON TOTAL CONSISTENCIA
  container.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card"><div class="m-title">Total Leads</div><div class="m-value">${totalLeads}</div></div>
      <div class="metric-card"><div class="m-title">Leads Nuevos</div><div class="m-value">${nuevosLeads}</div></div>
      <div class="metric-card"><div class="m-title">Monto Potencial</div><div class="m-value">$${montoPotencial.toLocaleString('es-MX', {minimumFractionDigits:2})}</div></div>
      <div class="metric-card"><div class="m-title">Monto Cerrado</div><div class="m-value">$${montoCerrado.toLocaleString('es-MX', {minimumFractionDigits:2})}</div></div>
    </div>
    <div class="filter-bar">
      <div class="search-box">
        <i class="ti ti-search"></i>
        <input type="text" id="txt-search-dashboard" placeholder="Buscar por nombre, empresa, notas..." value="${filterSearch}" oninput="filterSearch=this.value; renderDashboard();">
      </div>
      <select class="select-filter" onchange="filterEstado=this.value; renderDashboard();">${estadoOptions}</select>
      <select class="select-filter" onchange="filterEjecutivo=this.value; renderDashboard();">${ejecutivoOptions}</select>
    </div>
    <div class="view-toggle-container">
      <button class="view-btn ${currentDashboardViewMode === 'table' ? 'active' : ''}" onclick="currentDashboardViewMode='table'; renderDashboard();"><i class="ti ti-table"></i> Vista Tabla</button>
      <button class="view-btn ${currentDashboardViewMode === 'kanban' ? 'active' : ''}" onclick="currentDashboardViewMode='kanban'; renderDashboard();"><i class="ti ti-kanban"></i> Vista Kanban</button>
    </div>
    ${contentHtml}
  `;
}

function renderLeadsTab() {
  const container = document.getElementById('tab-leads');
  if (!container) return;

  container.innerHTML = `
    <div class="section-card">
      <div class="card-header-clean"><h3><i class="ti ti-database"></i> Universo de Leads Completo</h3><p>Lista general sin filtros restrictivos de estado</p></div>
      <div class="table-responsive">
        <table class="crm-table">
          <thead>
            <tr>
              <th>Lead / Empresa</th>
              <th>Contacto Directo</th>
              <th>Ecosistema</th>
              <th>Monto Est.</th>
              <th>Asignación</th>
              <th>Estado</th>
              <th>Última Act.</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${LEADS.length === 0 ? '<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:30px;">No hay ningún lead en el sistema.</td></tr>' : ''}
            ${LEADS.map(lead => `
              <tr>
                <td><strong>${lead.nombre}</strong><br><span style="font-size:11px;color:var(--text2);">${lead.empresa || 'Sin Empresa'}</span></td>
                <td>${lead.telefono || '—'}<br><span style="font-size:11px;color:var(--text2);">${lead.correo || '—'}</span></td>
                <td><span style="font-size:12px;">🌱 ${lead.fuente || 'No definida'}</span><br><span style="font-size:11px;color:var(--text2);">📦 ${lead.producto || 'Sin especificar'}</span></td>
                <td><strong>$${(Number(lead.montopotencial) || 0).toLocaleString('es-MX')}</strong><br><span style="font-size:11px;color:var(--text2);">Cierre: $${(Number(lead.montocerrado) || 0).toLocaleString('es-MX')}</span></td>
                <td><span style="font-size:12px;font-weight:500;">${lead.ejecutivo ? lead.ejecutivo.split(' - ')[0] : 'No Asignado'}</span><br><span style="font-size:11px;color:var(--text2);">${lead.responsable || '—'}</span></td>
                <td><span class="badge ${getBadgeClass(lead.estadolead)}">${lead.estadolead || 'Nuevo'}</span><br><span style="font-size:10px;color:var(--text3);font-weight:bold;">Prio: ${lead.prioridad || 'Media'}</span></td>
                <td style="font-size:11px;color:var(--text2);">${lead.ultimaactualizacion || '—'}</td>
                <td><button class="btn btn-secondary" style="padding:4px 8px; font-size:12px;" onclick="openEditLead('${lead.id}')"><i class="ti ti-edit"></i> Gestionar</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSeguimientoTab() {
  const container = document.getElementById('tab-seguimiento');
  if (!container) return;

  let agendaLeads = LEADS.filter(l => l.proximoseg).sort((a, b) => new Date(a.proximoseg) - new Date(b.proximoseg));

  container.innerHTML = `
    <div class="section-card">
      <div class="card-header-clean"><h3><i class="ti ti-calendar-clock"></i> Agenda de Próximos Seguimientos Obligatorios</h3><p>Organizados de forma prioritaria por fechas pactadas con el cliente</p></div>
      <div class="table-responsive">
        <table class="crm-table">
          <thead>
            <tr>
              <th>Fecha Programada</th>
              <th>Nombre del Cliente</th>
              <th>Teléfono / WhatsApp</th>
              <th>Responsable Interno</th>
              <th>Últimas Notas Registradas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${agendaLeads.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:20px;">No hay fechas programadas en el calendario comercial.</td></tr>' : ''}
            ${agendaLeads.map(lead => `
              <tr>
                <td><span style="font-weight:bold;color:#c0392b;"><i class="ti ti-alarm"></i> ${lead.proximoseg}</span></td>
                <td><strong>${lead.nombre}</strong><br><small style="color:var(--text2);">${lead.empresa || 'Individual'}</small></td>
                <td>${lead.telefono || '—'}</td>
                <td><span style="font-size:12px;">${lead.ejecutivo ? lead.ejecutivo.split(' - ')[0] : 'No Asignado'}</span></td>
                <td><p style="font-size:12px;max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${lead.notasventas || ''}">${lead.notasventas || '<span style="color:var(--text3);">Sin notas</span>'}</p></td>
                <td><button class="btn btn-secondary" style="padding:2px 6px; font-size:11px;" onclick="openEditLead('${lead.id}')">Abrir Bitácora</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderReportesTab() {
  const container = document.getElementById('tab-reportes');
  if (!container) return;

  const estadosArr = ['Nuevo', 'En Seguimiento', 'Demostración / Muestra', 'Negociación', 'Cerrado Ganado', 'Cerrado Perdido'];
  let htmlEstados = estadosArr.map(st => {
    let cant = LEADS.filter(l => l.estadolead === st).length;
    let pct = LEADS.length ? ((cant / LEADS.length) * 100).toFixed(1) : 0;
    return `
      <div style="display:flex; justify-content:space-between; font-size:13px; padding:4px 0; border-bottom:1px solid var(--border);">
        <span><strong>${st}:</strong> ${cant} leads</span>
        <span style="color:var(--text2); font-weight:bold;">${pct}%</span>
      </div>
    `;
  }).join('');

  let htmlEjecutivos = EJECUTIVOS.map(ej => {
    let name = ej.split(' - ')[0];
    let leadsAsignados = LEADS.filter(l => l.ejecutivo === ej);
    let ganados = leadsAsignados.filter(l => l.estadolead === 'Cerrado Ganado');
    let montoCierre = ganados.reduce((acc, curr) => acc + (Number(curr.montocerrado) || 0), 0);
    return `
      <div style="font-size:13px; padding:6px 0; border-bottom:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between;">
          <span><strong>${name}:</strong> ${leadsAsignados.length} asignados</span>
          <span style="color:var(--green); font-weight:bold;">Ganados: $${montoCierre.toLocaleString('es-MX')}</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="metrics-grid" style="grid-template-columns:1fr 1fr; margin-bottom:20px;">
      <div class="metric-card" style="text-align:left;"><div class="m-title" style="font-size:14px;font-weight:600;"><i class="ti ti-chart-pie"></i> Conversión por Estados del Embudo</div><div style="margin-top:15px; display:flex; flex-direction:column; gap:8px;">${htmlEstados}</div></div>
      <div class="metric-card" style="text-align:left;"><div class="m-title" style="font-size:14px;font-weight:600;"><i class="ti ti-users-group"></i> Productividad y Cierre por Ejecutivo de Cuentas</div><div style="margin-top:15px; display:flex; flex-direction:column; gap:8px;">${htmlEjecutivos}</div></div>
    </div>
  `;
}

function renderConfig() {
  const container = document.getElementById('tab-config');
  if (!container) return;

  container.innerHTML = `
    <div class="config-container">
      <div class="config-box">
        <h3><i class="ti ti-user-shield"></i> Cuentas de Acceso Administrativo Adicional</h3>
        <form id="frm-add-admin" class="config-form" onsubmit="saveAdminUser(event)">
          <input type="text" id="cfg-admin-user" placeholder="Nombre de usuario nuevo" required>
          <input type="password" id="cfg-admin-pass" placeholder="Establecer contraseña" required>
          <button type="submit" class="btn btn-primary" id="btn-admin-submit">Guardar Cuenta</button>
        </form>
        <ul class="config-list" id="ul-admins-list">
          ${ADMINS.map((adm, index) => `
            <li>
              <span><strong>${adm.user}</strong> (Administrador)</span>
              <div class="actions">
                <button type="button" class="btn btn-secondary" style="padding:2px 6px; font-size:11px;" onclick="startEditAdmin(${index})">Editar</button>
                <button type="button" class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="removeAdminUser(${index})">Remover</button>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-layers-intersect"></i> Catálogo de Fuentes de Tráfico Comercial</h3>
        <div class="config-tags-wrapper">${renderConfigTags(FUENTES, 'FUENTES')}</div>
        <div class="config-form">
          <input type="text" id="txt-new-fuente" placeholder="Ej. Recomendación Directa">
          <button type="button" class="btn btn-primary" onclick="addConfigItem('FUENTES', 'txt-new-fuente')">Agregar</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-brand-cupra"></i> Catálogo de Productos / Soluciones Ofrecidas</h3>
        <div class="config-tags-wrapper">${renderConfigTags(PRODUCTOS, 'PRODUCTOS')}</div>
        <div class="config-form">
          <input type="text" id="txt-new-producto" placeholder="Ej. Extracto de Alcachofa">
          <button type="button" class="btn btn-primary" onclick="addConfigItem('PRODUCTOS', 'txt-new-producto')">Agregar</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-wallet"></i> Rango de Presupuestos Comerciales Estimados</h3>
        <div class="config-tags-wrapper">${renderConfigTags(PRESUPUESTOS, 'PRESUPUESTOS')}</div>
        <div class="config-form">
          <input type="text" id="txt-new-presupuesto" placeholder="Ej. $10,000 - $20,000">
          <button type="button" class="btn btn-primary" onclick="addConfigItem('PRESUPUESTOS', 'txt-new-presupuesto')">Agregar</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-user-cog"></i> Catálogo de Ejecutivos y Asesores Comerciales</h3>
        <div class="config-tags-wrapper">${renderConfigTags(EJECUTIVOS, 'EJECUTIVOS')}</div>
        <div class="config-form">
          <input type="text" id="txt-new-ejecutivo" placeholder="Nombre completo — Rol específico">
          <button type="button" class="btn btn-primary" onclick="addConfigItem('EJECUTIVOS', 'txt-new-ejecutivo')">Agregar</button>
        </div>
      </div>
    </div>
  `;
}

function renderConfigTags(arr, type) {
  if (arr.length === 0) return `<span style="color:var(--text3); font-size:12px;">Catálogo vacío</span>`;
  return arr.map((item, idx) => `
    <span class="config-tag">
      ${item}
      <i class="ti ti-x close-tag-icon" onclick="removeConfigItem('${type}', ${idx})"></i>
    </span>
  `).join('');
}

function getBadgeClass(status) {
  switch (status) {
    case 'Nuevo': return 'bg-nuevo';
    case 'En Seguimiento': return 'bg-seguimiento';
    case 'Demostración / Muestra': return 'bg-muestra';
    case 'Negociación': return 'bg-negociacion';
    case 'Cerrado Ganado': return 'bg-ganado';
    case 'Cerrado Perdido': return 'bg-perdido';
    default: return 'bg-nuevo';
  }
}

function getColClassSuffix(status) {
  switch (status) {
    case 'Nuevo': return 'nuevo';
    case 'En Seguimiento': return 'seguimiento';
    case 'Demostración / Muestra': return 'muestra';
    case 'Negociación': return 'negociacion';
    case 'Cerrado Ganado': return 'ganado';
    case 'Cerrado Perdido': return 'perdido';
    default: return 'nuevo';
  }
}

// ─── FORMULARIOS FLUIDOS DEL PANEL SLIDER ─────────────────────────────────────
function injectFormLayout(lead = {}) {
  const container = document.getElementById('panel-content');
  if(!container) return;

  container.innerHTML = `
    <form id="crm-core-form" onsubmit="processLeadFormSubmit(event)">
      <div class="form-group"><label>Nombre Completo del Cliente *</label><input type="text" id="f-nombre" required placeholder="Ej. Miguel Sarmiento" value="${lead.nombre || ''}"></div>
      <div class="form-group"><label>Empresa / Organización</label><input type="text" id="f-empresa" placeholder="Ej. Herbolaria Distribuidora" value="${lead.empresa || ''}"></div>
      <div class="form-group"><label>Teléfono de Contacto (Móvil/WhatsApp)</label><input type="text" id="f-telefono" placeholder="Ej. +52 222XXXXXXX" value="${lead.telefono || ''}"></div>
      <div class="form-group"><label>Correo Electrónico Corporativo</label><input type="email" id="f-correo" placeholder="Ej. contacto@empresa.com" value="${lead.correo || ''}"></div>
      <div class="form-group"><label>Ciudad base</label><input type="text" id="f-ciudad" placeholder="Ej. Puebla" value="${lead.ciudad || ''}"></div>
      <div class="form-group"><label>Estado Geográfico / Región</label><input type="text" id="f-estado-geo" placeholder="Ej. Puebla, México" value="${lead.estado_geo || ''}"></div>
      
      <div class="form-group"><label>Canal o Fuente de Origen Comercial</label><select id="f-fuente"><option value="">Ninguna seleccionada</option>${FUENTES.map(f => `<option value="${f}" ${lead.fuente === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
      <div class="form-group"><label>Producto / Línea de Interés Principal</label><select id="f-producto"><option value="">Ninguno seleccionado</option>${PRODUCTOS.map(p => `<option value="${p}" ${lead.producto === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div class="form-group"><label>Rango de Presupuesto Comercial</label><select id="f-presupuesto"><option value="">Ninguno seleccionado</option>${PRESUPUESTOS.map(pr => `<option value="${pr}" ${lead.presupuestos === pr ? 'selected' : ''}>${pr}</option>`).join('')}</select></div>
      <div class="form-group"><label>Área Responsable del Lead Interno</label><select id="f-responsable"><option value="">Ninguna seleccionada</option>${RESPONSABLES.map(r => `<option value="${r}" ${lead.responsable === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="form-group"><label>Ejecutivo de Cuentas Asignado</label><select id="f-ejecutivo"><option value="">Ninguno seleccionado</option>${EJECUTIVOS.map(e => `<option value="${e}" ${lead.ejecutivo === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>

      <div class="form-group">
        <label>Estado del Lead en el Pipeline</label>
        <select id="f-estadolead">
          <option value="Nuevo">Nuevo</option><option value="En Seguimiento">En Seguimiento</option><option value="Demostración / Muestra">Demostración / Muestra</option><option value="Negociación">Negociación</option><option value="Cerrado Ganado">Cerrado Ganado</option><option value="Cerrado Perdido">Cerrado Perdido</option>
        </select>
      </div>
      <div class="form-group">
        <label>Nivel de Prioridad Operativa</label>
        <select id="f-prioridad">
          <option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option>
        </select>
      </div>

      <div class="form-group"><label>Próximo Seguimiento Programado (Calendario)</label><input type="date" id="f-proximoseg" value="${lead.proximoseg || ''}"></div>
      <div class="form-group"><label>Monto Potencial Estimado ($)</label><input type="number" id="f-montopotencial" value="${lead.montopotencial || 0}"></div>
      <div class="form-group"><label>Monto de Cierre Real Obtenido ($)</label><input type="number" id="f-montocerrado" value="${lead.montocerrado || 0}"></div>
      
      <div class="form-group"><label>Notas y Bitácora de Ventas</label><textarea id="f-notasventas" rows="3" placeholder="Detalles de las llamadas o mensajes...">${lead.notasventas || ''}</textarea></div>
      <div class="form-group"><label>Notas de Dirección / Gerencia General</label><textarea id="f-notasgerencia" rows="3" placeholder="Instrucciones internas de gerencia...">${lead.notasgerencia || ''}</textarea></div>
      
      <div class="panel-actions">
        <button type="submit" class="btn btn-primary" style="flex:1;"><i class="ti ti-device-floppy"></i> Guardar Ficha</button>
        ${lead.id ? `<button type="button" class="btn btn-danger" onclick="deleteLeadFromDatabase('${lead.id}')"><i class="ti ti-trash"></i> Eliminar Registro</button>` : ''}
      </div>
    </form>
  `;

  if(lead.estadolead) document.getElementById('f-estadolead').value = lead.estadolead;
  if(lead.prioridad) document.getElementById('f-prioridad').value = lead.prioridad;
}

function openNewLead() {
  currentEditId = null;
  document.getElementById('panel-title').innerHTML = '<i class="ti ti-user-plus"></i> Registrar Nuevo Lead';
  injectFormLayout();
  togglePanel(true);
}

function openEditLead(id) {
  const targetLead = LEADS.find(l => String(l.id) === String(id));
  if(!targetLead) return;

  currentEditId = id;
  document.getElementById('panel-title').innerHTML = '<i class="ti ti-file-text"></i> Editar Expediente de Lead';
  injectFormLayout(targetLead);
  togglePanel(true);
}

// ─── PERSISTENCIA CENTRALIZADA EN SUPABASE ────────────────────────────────────
async function processLeadFormSubmit(e) {
  e.preventDefault();

  const payload = {
    nombre: document.getElementById('f-nombre').value.trim(),
    empresa: document.getElementById('f-empresa').value.trim() || null,
    telefono: document.getElementById('f-telefono').value.trim() || null,
    correo: document.getElementById('f-correo').value.trim() || null,
    ciudad: document.getElementById('f-ciudad').value.trim() || null,
    estado_geo: document.getElementById('f-estado-geo').value.trim() || null,
    fuente: document.getElementById('f-fuente').value || null,
    producto: document.getElementById('f-producto').value || null,
    presupuestos: document.getElementById('f-presupuesto').value || null,
    responsable: document.getElementById('f-responsable').value || null,
    ejecutivo: document.getElementById('f-ejecutivo').value || null,
    estadolead: document.getElementById('f-estadolead').value,
    prioridad: document.getElementById('f-prioridad').value,
    proximoseg: document.getElementById('f-proximoseg').value || null,
    montopotencial: parseInt(document.getElementById('f-montopotencial').value) || 0,
    montocerrado: parseInt(document.getElementById('f-montocerrado').value) || 0,
    notasventas: document.getElementById('f-notasventas').value.trim() || null,
    notasgerencia: document.getElementById('f-notasgerencia').value.trim() || null,
    ultimaactualizacion: new Date().toLocaleString('es-MX')
  };

  try {
    if (currentEditId) {
      const { error } = await supabaseClient
        .from('leads')
        .update(payload)
        .eq('id', currentEditId);

      if (error) throw error;
      notify('🔄 Cambios sincronizados de inmediato en la base de datos central');
    } else {
      const { error } = await supabaseClient
        .from('leads')
        .insert([payload]);

      if (error) throw error;
      notify('✅ Registro guardado exitosamente en la nube', 'success');
    }

    togglePanel(false);
    fetchLeadsFromSupabase();

  } catch (err) {
    console.error('Error al guardar datos:', err.message);
    alert('❌ Falla de almacenamiento remota: ' + err.message);
  }
}

async function deleteLeadFromDatabase(id) {
  if (!checkPasswordPrompt('Eliminar de forma definitiva e irreversible este Lead')) return;

  if (confirm('¿Confirmas que deseas eliminar por completo este registro del CRM?')) {
    try {
      const { error } = await supabaseClient
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      notify('🗑 El expediente fue removido de la nube', 'warning');
      togglePanel(false);
      fetchLeadsFromSupabase();
    } catch (err) {
      console.error('Error al eliminar:', err.message);
      alert('❌ Error al procesar la baja de datos remota.');
    }
  }
}

// ─── GESTIÓN DE LOCALSTORAGE PARA CATÁLOGOS ───────────────────────────────────
function saveConfigStorage() {
  localStorage.setItem('cfg_admins', JSON.stringify(ADMINS));
  localStorage.setItem('cfg_fuentes', JSON.stringify(FUENTES));
  localStorage.setItem('cfg_productos', JSON.stringify(PRODUCTOS));
  localStorage.setItem('cfg_presupuestos', JSON.stringify(PRESUPUESTOS));
  localStorage.setItem('cfg_responsables', JSON.stringify(RESPONSABLES));
  localStorage.setItem('cfg_ejecutives', JSON.stringify(EJECUTIVOS));
}

function addConfigItem(type, inputId) {
  const input = document.getElementById(inputId);
  if(!input) return;
  const value = input.value.trim();
  if(!value) return;

  if(!checkPasswordPrompt(`Agregar el elemento [${value}] al catálogo operativo`)) return;

  if(type === 'FUENTES') FUENTES.push(value);
  else if(type === 'PRODUCTOS') PRODUCTOS.push(value);
  else if(type === 'PRESUPUESTOS') PRESUPUESTOS.push(value);
  else if(type === 'EJECUTIVOS') EJECUTIVOS.push(value);

  input.value = '';
  saveConfigStorage();
  renderConfig();
  notify('➕ Configuración agregada correctamente');
}

function removeConfigItem(type, index) {
  if(!checkPasswordPrompt('Eliminar permanentemente este elemento de la lista global')) return;

  if(type === 'FUENTES') FUENTES.splice(index, 1);
  else if(type === 'PRODUCTOS') PRODUCTOS.splice(index, 1);
  else if(type === 'PRESUPUESTOS') PRESUPUESTOS.splice(index, 1);
  else if(type === 'EJECUTIVOS') EJECUTIVOS.splice(index, 1);

  saveConfigStorage();
  renderConfig();
  notify('🗑 Catálogo actualizado', 'warning');
}

function saveAdminUser(e) {
  e.preventDefault();
  const userVal = document.getElementById('cfg-admin-user').value.trim();
  const passVal = document.getElementById('cfg-admin-pass').value;

  if(!userVal || !passVal) return;

  if(userVal.toLowerCase() === AUTH_USER.toLowerCase()) {
    alert('❌ Reservado: No puedes registrar la cuenta maestra principal.');
    return;
  }

  if (editingAdminIndex !== null) {
    updateAdminUser(userVal, passVal);
    return;
  }

  const yaExiste = ADMINS.some(adm => adm.user.toLowerCase() === userVal.toLowerCase());
  if(yaExiste) {
    alert('❌ Conflicto: Ese nombre de usuario ya está asignado.');
    return;
  }

  if(!checkPasswordPrompt(`Generar credenciales para un nuevo administrador [${userVal}]`)) return;

  ADMINS.push({ user: userVal, pass: passVal });
  document.getElementById('frm-add-admin').reset();
  saveConfigStorage();
  renderConfig();
  notify('👥 Cuenta administrativa creada con éxito', 'success');
}

function startEditAdmin(index) {
  editingAdminIndex = index;
  const target = ADMINS[index];
  document.getElementById('cfg-admin-user').value = target.user;
  document.getElementById('cfg-admin-pass').value = target.pass;
  document.getElementById('btn-admin-submit').innerText = "Actualizar Cuenta";
}

function updateAdminUser(userVal, passVal) {
  const existeDuplicado = ADMINS.some((admin, i) => i !== editingAdminIndex && admin.user.toLowerCase() === userVal.toLowerCase());
  if (existeDuplicado) {
    alert('❌ Otro administrador ya está usando ese nombre de usuario.');
    return;
  }

  if (!checkPasswordPrompt(`Modificar la configuración del usuario "${ADMINS[editingAdminIndex].user}"`)) return;

  ADMINS[editingAdminIndex] = { user: userVal, pass: passVal };
  editingAdminIndex = null;
  document.getElementById('btn-admin-submit').innerText = "Guardar Cuenta";
  document.getElementById('frm-add-admin').reset();

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

// ─── ENRUTADOR DE NOTIFICACIONES TOAST ────────────────────────────────────────
function notify(message, type = 'primary') {
  const container = document.getElementById('notification-container');
  if(!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-notif ${type}`;
  toast.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><span>${message}</span><button type="button" style="border:none; background:transparent; font-weight:bold; color:inherit; cursor:pointer;" onclick="this.parentElement.parentElement.remove()">×</button></div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.onload = function() {
  if (sessionStorage.getItem('crm_logged_in') === 'true') {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    fetchLeadsFromSupabase();
    subscribeToLeadsRealtime();
  } else {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('main-layout').style.display = 'none';
  }
};
