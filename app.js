// ─── CONFIGURACIÓN DE CONEXIÓN CON SUPABASE ───────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Arreglos globales dinámicos que se sincronizan con Supabase
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

// ─── FUNCIÓN AUXILIAR DE VALIDACIÓN DE SEGURIDAD EXCLUSIVA ────────────────────
function solicitarYValidarContrasena(accionTexto) {
  const passwordIntroducido = prompt(`🔒 Ingrese la contraseña actual del CRM para autorizar la acción:\n"${accionTexto}"`);
  
  if (passwordIntroducido === null) return false; // El usuario canceló

  // Obtener las credenciales vigentes en tiempo real desde localStorage o memoria
  const currentPass = localStorage.getItem('crm_current_pass') || "Saludable*";

  if (passwordIntroducido === currentPass) {
    return true;
  } else {
    alert("❌ Contraseña incorrecta. Acción cancelada y no autorizada.");
    return false;
  }
}

// ─── CARGA INICIAL DE CONFIGURACIONES DESDE SUPABASE ─────────────────────────
async function fetchConfiguraciones() {
  try {
    // Inicializar contraseña local si no existe
    if (!localStorage.getItem('crm_current_pass')) {
      localStorage.setItem('crm_current_pass', "Saludable*");
      localStorage.setItem('crm_current_user', "Herbolaria");
    }

    const { data: dataCfg, error: errCfg } = await _supabase.from('crm_configuraciones').select('*');
    if (errCfg) throw errCfg;

    // Clasificar registros por tipo
    FUENTES = dataCfg.filter(c => c.tipo === 'fuente').map(c => c.valor);
    PRODUCTOS = dataCfg.filter(c => c.tipo === 'producto').map(c => c.valor);
    PRESUPUESTOS = dataCfg.filter(c => c.tipo === 'presupuesto').map(c => c.valor);
    ESTADOS_PIPELINE = dataCfg.filter(c => c.tipo === 'estado').map(c => c.valor);

    // Si la base está vacía o faltan configuraciones críticas, cargar mocks por defecto
    if(FUENTES.length === 0) {
      FUENTES = ['Facebook Ads', 'Instagram Ads', 'Google Ads', 'WhatsApp', 'Referido', 'Página Web', 'TikTok'];
      await guardarMultiplesConfiguraciones('fuente', FUENTES);
    }
    if(PRODUCTOS.length === 0) {
      PRODUCTOS = ['Cápsulas Herbolarias', 'Tés Medicinales', 'Extractos Líquidos', 'Suplementos Vitamínicos'];
      await guardarMultiplesConfiguraciones('producto', PRODUCTOS);
    }
    if(PRESUPUESTOS.length === 0) {
      PRESUPUESTOS = ['< $5,000', '$5,000 - $15,000', '$15,000 - $50,000', '> $50,000'];
      await guardarMultiplesConfiguraciones('presupuesto', PRESUPUESTOS);
    }
    if(ESTADOS_PIPELINE.length === 0) {
      ESTADOS_PIPELINE = ['Nuevo', 'Contactado', 'Calificado', 'Propuesta Enviada', 'En Negociación', 'Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'];
      await guardarMultiplesConfiguraciones('estado', ESTADOS_PIPELINE);
    }

    // Cargar cuentas adicionales de administradores desde Supabase
    const { data: dataAdmins, error: errAdmins } = await _supabase.from('crm_usuarios_admin').select('*');
    if (!errAdmins && dataAdmins) {
      ADMINS = dataAdmins;
    }

  } catch (error) {
    console.error("Error cargando configuraciones iniciales:", error);
  }
}

async function guardarMultiplesConfiguraciones(tipo, arrayValores) {
  const rows = arrayValores.map(v => ({ tipo: tipo, valor: v }));
  await _supabase.from('crm_configuraciones').insert(rows);
}

// ─── SISTEMA DE AUTENTICACIÓN Y ACCESO ────────────────────────────────────────
function handleLogin() {
  const userVal = document.getElementById('login-user').value.trim();
  const passVal = document.getElementById('login-pass').value;
  const errorMsg = document.getElementById('login-error');

  const masterUser = localStorage.getItem('crm_current_user') || "Herbolaria";
  const masterPass = localStorage.getItem('crm_current_pass') || "Saludable*";

  // Verificar cuenta maestra o cuentas adicionales cargadas
  const matchAdmin = ADMINS.find(a => a.usuario.toLowerCase() === userVal.toLowerCase() && a.contrasena === passVal);

  if ((userVal.toLowerCase() === masterUser.toLowerCase() && passVal === masterPass) || matchAdmin) {
    if(errorMsg) errorMsg.style.display = 'none';
    sessionStorage.setItem('crm_logged_in', 'true');
    sessionStorage.setItem('crm_user_activo', userVal);
    
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    
    inicializarCRM();
  } else {
    if(errorMsg) errorMsg.style.display = 'block';
  }
}

function handleLogout() {
  sessionStorage.removeItem('crm_logged_in');
  sessionStorage.removeItem('crm_user_activo');
  document.getElementById('main-layout').style.display = 'none';
  document.getElementById('login-container').style.display = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
}

// ─── CONTROLADOR GLOBAL DE PESTAÑAS DEL SISTEMA ──────────────────────────────
function switchTab(tabId, element) {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => t.classList.remove('active'));
  element.classList.add('active');

  const contents = ['tab-dashboard', 'tab-leads', 'tab-seguimiento', 'tab-reportes', 'tab-config'];
  contents.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });

  const activeContent = document.getElementById(`tab-${tabId}`);
  if(activeContent) {
    activeContent.style.display = 'block';
    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'leads') renderLeadsTable();
    if (tabId === 'seguimiento') renderSeguimiento();
    if (tabId === 'reportes') renderReportes();
    if (tabId === 'config') renderConfiguracionTab();
  }
}

// ─── INICIALIZACIÓN GENERAL DE DATOS A SUPABASE ────────────────────────────────
async function inicializarCRM() {
  await fetchConfiguraciones();
  await cargarLeadsSupabase();
  renderDashboard();
  llenarSelectsFormularioLeads();
  verificarSeguimientosHoy(LEADS);
}

async function cargarLeadsSupabase() {
  try {
    const { data, error } = await _supabase.from('crm_leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    LEADS = data || [];
  } catch (err) {
    console.error("Error al descargar leads de Supabase:", err);
  }
}

// ─── LLENADO DINÁMICO DE SELECTORES EN PANEL ───────────────────────────────────
function llenarSelectsFormularioLeads() {
  llenarSelectEspecifico('n-fuente', FUENTES);
  llenarSelectEspecifico('n-producto', PRODUCTOS);
  llenarSelectEspecifico('n-presupuesto', PRESUPUESTOS);
  llenarSelectEspecifico('n-responsable', RESPONSABLES);
  llenarSelectEspecifico('n-prioridad', PRIORIDADES);
  llenarSelectEspecifico('n-situacion', ESTADOS_PIPELINE);
}

function llenarSelectEspecifico(idElemento, arrayDatos) {
  const select = document.getElementById(idElemento);
  if(!select) return;
  select.innerHTML = '';
  arrayDatos.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    select.appendChild(opt);
  });
}

// ─── OPERACIONES Y APARTADO DE LEADS (GUARDAR / EDITAR) ────────────────────────
function openNewLead() {
  currentLeadId = null;
  document.getElementById('panel-title').innerHTML = '<i class="ti ti-user-plus"></i> Nuevo Lead';
  
  // Limpiar inputs
  document.getElementById('n-nombre').value = '';
  document.getElementById('n-empresa').value = '';
  document.getElementById('n-telefono').value = '';
  document.getElementById('n-correo').value = '';
  document.getElementById('n-ciudad').value = '';
  document.getElementById('n-estadorep').value = '';
  document.getElementById('n-seg').value = '';
  document.getElementById('n-notas').value = '';
  
  llenarSelectsFormularioLeads();
  document.getElementById('btn-delete-lead').style.display = 'none';
  togglePanel(true);
}

function editLead(id) {
  const lead = LEADS.find(l => l.id == id);
  if (!lead) return;

  currentLeadId = lead.id;
  document.getElementById('panel-title').innerHTML = '<i class="ti ti-edit"></i> Editar Lead';

  document.getElementById('n-nombre').value = lead.nombre || '';
  document.getElementById('n-empresa').value = lead.empresa || '';
  document.getElementById('n-telefono').value = lead.telefono || '';
  document.getElementById('n-correo').value = lead.correo || '';
  document.getElementById('n-ciudad').value = lead.ciudad || '';
  document.getElementById('n-estadorep').value = lead.estado_rep || '';
  document.getElementById('n-notas').value = lead.notas || '';
  
  if(lead.proximoseg) {
    document.getElementById('n-seg').value = lead.proximoseg.substring(0, 16);
  } else {
    document.getElementById('n-seg').value = '';
  }

  llenarSelectsFormularioLeads();
  
  document.getElementById('n-fuente').value = lead.fuente;
  document.getElementById('n-producto').value = lead.producto;
  document.getElementById('n-presupuesto').value = lead.presupuesto;
  document.getElementById('n-responsable').value = lead.responsable;
  document.getElementById('n-prioridad').value = lead.prioridad;
  document.getElementById('n-situacion').value = lead.estado || 'Nuevo';

  document.getElementById('btn-delete-lead').style.display = 'block';
  togglePanel(true);
}

async function guardarLeadFormulario() {
  const nombre = document.getElementById('n-nombre').value.trim();
  const telefono = document.getElementById('n-telefono').value.trim();

  if (!nombre || !telefono) {
    alert("⚠️ Los campos Nombre y Teléfono son completamente obligatorios.");
    return;
  }

  // ACCIÓN CRÍTICA: Solicitar validación de contraseña de seguridad
  const accion = currentLeadId ? "Modificar y guardar cambios del Lead existente" : "Crear y registrar un nuevo Lead en el sistema";
  if (!solicitarYValidarContrasena(accion)) return;

  const leadData = {
    nombre: nombre,
    empresa: document.getElementById('n-empresa').value.trim(),
    telefono: telefono,
    correo: document.getElementById('n-correo').value.trim(),
    ciudad: document.getElementById('n-ciudad').value.trim(),
    estado_rep: document.getElementById('n-estadorep').value.trim(),
    fuente: document.getElementById('n-fuente').value,
    producto: document.getElementById('n-producto').value,
    presupuesto: document.getElementById('n-presupuesto').value,
    responsable: document.getElementById('n-responsable').value,
    prioridad: document.getElementById('n-prioridad').value,
    estado: document.getElementById('n-situacion').value,
    proximoseg: document.getElementById('n-seg').value || null,
    notas: document.getElementById('n-notas').value.trim()
  };

  try {
    if (currentLeadId) {
      // Actualizar registro en Supabase
      const { error } = await _supabase.from('crm_leads').update(leadData).eq('id', currentLeadId);
      if (error) throw error;
      notify("✅ Lead modificado y guardado correctamente");
    } else {
      // Crear registro en Supabase
      const { error } = await _supabase.from('crm_leads').insert([leadData]);
      if (error) throw error;
      notify("✅ ¡Nuevo Lead registrado con éxito!");
    }

    togglePanel(false);
    await cargarLeadsSupabase();
    
    // Forzar redibujado de la pestaña actual en la que esté el usuario
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
      if (activeTab.textContent.includes('Dashboard')) renderDashboard();
      if (activeTab.textContent.includes('Todos los Leads')) renderLeadsTable();
      if (activeTab.textContent.includes('Seguimiento')) renderSeguimiento();
      if (activeTab.textContent.includes('Reportes')) renderReportes();
    }

  } catch (err) {
    console.error("Error al guardar en Supabase:", err);
    alert("❌ Error interno al guardar los datos en Supabase.");
  }
}

async function eliminarLeadActual() {
  if (!currentLeadId) return;
  
  if (!solicitarYValidarContrasena("Eliminar permanentemente este Lead del CRM")) return;

  try {
    const { error } = await _supabase.from('crm_leads').delete().eq('id', currentLeadId);
    if (error) throw error;

    notify("🗑 Lead eliminado permanentemente.");
    togglePanel(false);
    await cargarLeadsSupabase();
    
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
      if (activeTab.textContent.includes('Dashboard')) renderDashboard();
      if (activeTab.textContent.includes('Todos los Leads')) renderLeadsTable();
      if (activeTab.textContent.includes('Seguimiento')) renderSeguimiento();
    }
  } catch (err) {
    console.error(err);
    alert("❌ No se pudo eliminar el registro.");
  }
}

// ─── RENDERIZADO DEL DASHBOARD (CONSERVA TU MAQUETACIÓN EXACTA) ─────────────
function renderDashboard() {
  const container = document.getElementById('tab-dashboard');
  if(!container) return;

  // Estadísticas operativas rápidas
  const total = LEADS.length;
  const ganados = LEADS.filter(l => l.estado === 'Cerrado Ganado').length;
  const perdidos = LEADS.filter(l => l.estado === 'Cerrado Perdido').length;
  const enProceso = total - ganados - perdidos;

  container.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-val">${total}</div>
        <div class="metric-label">Leads Totales</div>
      </div>
      <div class="metric-card" style="border-left: 4px solid #1D9E75;">
        <div class="metric-val">${enProceso}</div>
        <div class="metric-label">En Negociación / Activos</div>
      </div>
      <div class="metric-card" style="border-left: 4px solid #2e7d32;">
        <div class="metric-val">${ganados}</div>
        <div class="metric-label">Ventas Exitosas</div>
      </div>
      <div class="metric-card" style="border-left: 4px solid #c62828;">
        <div class="metric-val">${perdidos}</div>
        <div class="metric-label">Leads Perdidos</div>
      </div>
    </div>

    <div style="margin-top:24px; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px;">
      <h3 style="margin-bottom:16px; font-size:15px; font-weight:600;"><i class="ti ti-alert-circle"></i> Leads Recientes Añadidos</h3>
      <div style="overflow-x:auto;">
        <table class="leads-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Fuente</th>
              <th>Producto de Interés</th>
              <th>Responsable</th>
              <th>Prioridad</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${LEADS.slice(0, 5).map(l => `
              <tr>
                <td><strong>${l.nombre}</strong><br><small style="color:var(--text2)">${l.telefono}</small></td>
                <td><span class="badge">${l.fuente}</span></td>
                <td>${l.producto}</td>
                <td><small>${l.responsable}</small></td>
                <td><span class="prio-${l.prioridad ? l.prioridad.toLowerCase() : 'baja'}">${l.prioridad || 'Baja'}</span></td>
                <td><span class="badge" style="background:var(--bg3); color:var(--text);">${l.estado || 'Nuevo'}</span></td>
                <td><button class="btn btn-secondary" style="padding:4px 8px; font-size:12px" onclick="editLead(${l.id})"><i class="ti ti-edit"></i> Ver</button></td>
              </tr>
            `).join('')}
            ${LEADS.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:20px;">No hay leads registrados aún.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── PESTAÑA DE TODOS LOS LEADS ────────────────────────────────────────────────
function renderLeadsTable() {
  const container = document.getElementById('tab-leads');
  if(!container) return;

  container.innerHTML = `
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="font-size:15px; font-weight:600;"><i class="ti ti-list"></i> Base de Datos General</h3>
        <span style="color:var(--text2); font-size:13px;">Total: ${LEADS.length} registros</span>
      </div>
      <div style="overflow-x:auto;">
        <table class="leads-table">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Ubicación</th>
              <th>Fuente</th>
              <th>Producto</th>
              <th>Presupuesto</th>
              <th>Responsable</th>
              <th>Estado Pipeline</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${LEADS.map(l => `
              <tr>
                <td><strong>${l.nombre}</strong><br><small style="color:var(--text2)">${l.telefono} | ${l.correo || 'Sin correo'}</small></td>
                <td><small>${l.ciudad || ''}, ${l.estado_rep || ''}</small></td>
                <td><span class="badge">${l.fuente}</span></td>
                <td>${l.producto}</td>
                <td><small>${l.presupuesto}</small></td>
                <td><small>${l.responsable}</small></td>
                <td><span class="badge" style="background:var(--green); color:#fff;">${l.estado || 'Nuevo'}</span></td>
                <td><button class="btn btn-primary" style="padding:4px 8px; font-size:12px" onclick="editLead(${l.id})"><i class="ti ti-edit"></i> Editar</button></td>
              </tr>
            `).join('')}
            ${LEADS.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text3)">Ningún lead registrado en el sistema.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── PESTAÑA DE SEGUIMIENTO (ORGANIZADO) ───────────────────────────────────────
function renderSeguimiento() {
  const container = document.getElementById('tab-seguimiento');
  if(!container) return;

  const hoyStr = new Date().toLocaleDateString('es-MX');

  const pendientes = LEADS.filter(l => {
    if(!l.proximoseg || l.estado === 'Cerrado Ganado' || l.estado === 'Cerrado Perdido' || l.estado === 'Abandonado') return false;
    const f = new Date(l.proximoseg);
    return f.toLocaleDateString('es-MX') === hoyStr;
  });

  const futuros = LEADS.filter(l => {
    if(!l.proximoseg || l.estado === 'Cerrado Ganado' || l.estado === 'Cerrado Perdido' || l.estado === 'Abandonado') return false;
    const f = new Date(l.proximoseg);
    return f.getTime() > new Date().getTime() && f.toLocaleDateString('es-MX') !== hoyStr;
  });

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
      
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px;">
        <div class="seg-section-title">
          <i class="ti ti-bell-ringing" style="color:#d32f2f"></i>
          <span><b>Seguimientos para el Día de Hoy</b> (${pendientes.length})</span>
        </div>
        ${pendientes.map(l => `
          <div style="background:var(--bg2); padding:12px; border-radius:var(--radius); margin-bottom:10px; border-left:4px solid #d32f2f;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <strong>${l.nombre}</strong><br>
                <small style="color:var(--text2)">📞 ${l.telefono} | 👤 ${l.responsable}</small>
              </div>
              <button class="btn btn-secondary" style="padding:2px 6px; font-size:12px" onclick="editLead(${l.id})">Atender</button>
            </div>
            <div style="margin-top:6px; font-size:12px; color:#c62828;">
              <i class="ti ti-clock"></i> Hora: ${new Date(l.proximoseg).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
            </div>
          </div>
        `).join('')}
        ${pendientes.length === 0 ? '<div class="empty">🎉 Al corriente. No tienes seguimientos agendados para hoy.</div>' : ''}
      </div>

      <div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px;">
        <div class="seg-section-title">
          <i class="ti ti-calendar" style="color:var(--green)"></i>
          <span><b>Próximos Seguimientos Planificados</b> (${futuros.length})</span>
        </div>
        ${futuros.map(l => `
          <div style="background:var(--bg2); padding:12px; border-radius:var(--radius); margin-bottom:10px; border-left:4px solid var(--green);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <strong>${l.nombre}</strong><br>
                <small style="color:var(--text2)">👤 ${l.responsable} | 📦 ${l.producto}</small>
              </div>
              <button class="btn btn-secondary" style="padding:2px 6px; font-size:12px" onclick="editLead(${l.id})">Ver</button>
            </div>
            <div style="margin-top:6px; font-size:12px; color:var(--text2)">
              <i class="ti ti-calendar-event"></i> Fecha: ${new Date(l.proximoseg).toLocaleString('es-MX', {dateStyle:'short', timeStyle:'short'})}
            </div>
          </div>
        `).join('')}
        ${futuros.length === 0 ? '<div class="empty">No hay seguimientos agendados para días posteriores.</div>' : ''}
      </div>

    </div>
  `;
}

// ─── PESTAÑA DE REPORTES: RESPETANDO TUS GRÁFICAS DE BARRAS HORIZONTALES ─────
function renderReportes() {
  const container = document.getElementById('tab-reportes');
  if(!container) return;

  // 1. Agrupación estricta por Fuente
  const conteoFuentes = {};
  FUENTES.forEach(f => conteoFuentes[f] = 0);
  LEADS.forEach(l => { if(conteoFuentes[l.fuente] !== undefined) conteoFuentes[l.fuente]++; });

  // 2. Agrupación estricta por Estado del Pipeline
  const conteoEstados = {};
  ESTADOS_PIPELINE.forEach(e => conteoEstados[e] = 0);
  LEADS.forEach(l => { if(conteoEstados[l.estado] !== undefined) conteoEstados[l.estado]++; });

  const maxFuente = Math.max(...Object.values(conteoFuentes), 1);
  const maxEstado = Math.max(...Object.values(conteoEstados), 1);

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr; gap:24px;">
      
      <div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px;">
        <h3 style="font-size:15px; font-weight:600; margin-bottom:16px;"><i class="ti ti-chart-bar"></i> Distribución de Leads por Fuente de Origen</h3>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${Object.entries(conteoFuentes).map(([fuente, cant]) => {
            const pct = (cant / maxFuente) * 100;
            return `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                  <span><strong>${fuente}</strong></span>
                  <span style="color:var(--text2)">${cant} leads</span>
                </div>
                <div style="background:var(--bg3); height:20px; border-radius:4px; overflow:hidden; position:relative;">
                  <div style="background:var(--green); width:${pct}%; height:100%; transition:width 0.4s ease;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div style="background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-lg); padding:20px;">
        <h3 style="font-size:15px; font-weight:600; margin-bottom:16px;"><i class="ti ti-git-commit"></i> Estado del Pipeline Comercial</h3>
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${Object.entries(conteoEstados).map(([estado, cant]) => {
            const pct = (cant / maxEstado) * 100;
            return `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                  <span><strong>${estado}</strong></span>
                  <span style="color:var(--text2)">${cant} leads</span>
                </div>
                <div style="background:var(--bg3); height:20px; border-radius:4px; overflow:hidden; position:relative;">
                  <div style="background:var(--green-dk); width:${pct}%; height:100%; transition:width 0.4s ease;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>
  `;
}

// ─── PESTAÑA DE CONFIGURACIÓN (CAJAS Y ELEMENTOS VINCULADOS AL 100%) ──────────
function renderConfiguracionTab() {
  const container = document.getElementById('tab-config');
  if(!container) return;

  container.innerHTML = `
    <div class="config-container">
      
      <div class="config-box">
        <h3><i class="ti ti-key"></i> Actualizar Contraseña del Sistema</h3>
        <div style="display:flex; flex-direction:column; gap:10px; max-width:400px; margin-top:10px;">
          <div class="form-group">
            <label>Nueva Contraseña</label>
            <input type="password" id="cfg-new-pass" placeholder="Mínimo 6 caracteres">
          </div>
          <button class="btn btn-primary" style="width:fit-content" onclick="actualizarContrasenaMaster()">Actualizar Contraseña</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-user-plus"></i> Añadir Nueva Cuenta de Administrador</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; max-width:500px; margin-top:10px;">
          <div class="form-group"><label>Usuario</label><input type="text" id="cfg-new-user" placeholder="Ej. Ventas2"></div>
          <div class="form-group"><label>Contraseña</label><input type="password" id="cfg-new-user-pass" placeholder="••••••••"></div>
        </div>
        <button class="btn btn-primary" style="margin-top:10px;" onclick="agregarCuentaAdminAdicional()">Añadir Cuenta</button>
        
        <div style="margin-top:16px;">
          <strong style="font-size:12px; color:var(--text2);">Cuentas Adicionales Vigentes:</strong>
          <ul style="margin-top:6px; font-size:13px; padding-left:20px; color:var(--text);">
            ${ADMINS.map((a, idx) => `<li>👤 <b>${a.usuario}</b> <button class="btn btn-danger" style="padding:2px 6px; font-size:11px; margin-left:8px;" onclick="eliminarCuentaAdmin(${a.id}, '${a.usuario}')">Eliminar</button></li>`).join('')}
            ${ADMINS.length === 0 ? '<li style="color:var(--text3); list-style:none; padding-left:0;">No hay cuentas secundarias agregadas.</li>' : ''}
          </ul>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-forms"></i> Fuentes de Origen</h3>
        <div class="config-tags-wrapper">
          ${FUENTES.map(f => `<span class="config-tag">${f}</span>`).join('')}
        </div>
        <div style="display:flex; gap:8px; max-width:400px;">
          <input type="text" id="add-fuente" class="form-group" style="padding:6px; margin:0;" placeholder="Nueva fuente...">
          <button class="btn btn-primary" onclick="agregarElementoConfig('fuente', 'add-fuente')">Añadir</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-package"></i> Productos de Interés</h3>
        <div class="config-tags-wrapper">
          ${PRODUCTOS.map(p => `<span class="config-tag">${p}</span>`).join('')}
        </div>
        <div style="display:flex; gap:8px; max-width:400px;">
          <input type="text" id="add-producto" class="form-group" style="padding:6px; margin:0;" placeholder="Nuevo producto...">
          <button class="btn btn-primary" onclick="agregarElementoConfig('producto', 'add-producto')">Añadir</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-coin"></i> Rangos de Presupuesto Estimado</h3>
        <div class="config-tags-wrapper">
          ${PRESUPUESTOS.map(pr => `<span class="config-tag">${pr}</span>`).join('')}
        </div>
        <div style="display:flex; gap:8px; max-width:400px;">
          <input type="text" id="add-presupuesto" class="form-group" style="padding:6px; margin:0;" placeholder="Ej. $5,000 - $10,000">
          <button class="btn btn-primary" onclick="agregarElementoConfig('presupuesto', 'add-presupuesto')">Añadir</button>
        </div>
      </div>

      <div class="config-box">
        <h3><i class="ti ti-git-fork"></i> Estados del Pipeline Comercial</h3>
        <div class="config-tags-wrapper">
          ${ESTADOS_PIPELINE.map(e => `<span class="config-tag">${e}</span>`).join('')}
        </div>
        <div style="display:flex; gap:8px; max-width:400px;">
          <input type="text" id="add-estado" class="form-group" style="padding:6px; margin:0;" placeholder="Nuevo estado de flujo...">
          <button class="btn btn-primary" onclick="agregarElementoConfig('estado', 'add-estado')">Añadir</button>
        </div>
      </div>

    </div>
  `;
}

// ─── ACCIONES DE CONFIGURACIÓN CON VALIDACIÓN DE CONTRASEÑA EN TIEMPO REAL ───
async function actualizarContrasenaMaster() {
  const newPass = document.getElementById('cfg-new-pass').value;
  if (!newPass || newPass.length < 6) {
    alert("⚠️ La nueva contraseña debe tener como mínimo 6 caracteres válidos.");
    return;
  }

  // Validar con la contraseña anterior antes de sobrescribir
  if (!solicitarYValidarContrasena("Actualizar la contraseña maestra del sistema")) return;

  try {
    localStorage.setItem('crm_current_pass', newPass);
    notify("✅ Contraseña del sistema actualizada correctamente");
    document.getElementById('cfg-new-pass').value = '';
    renderConfiguracionTab();
  } catch(e) {
    alert("❌ Error al actualizar la contraseña local.");
  }
}

async function agregarCuentaAdminAdicional() {
  const user = document.getElementById('cfg-new-user').value.trim();
  const pass = document.getElementById('cfg-new-user-pass').value;

  if (!user || !pass) {
    alert("⚠️ Debes rellenar los campos de Usuario y Contraseña.");
    return;
  }

  if (!solicitarYValidarContrasena(`Crear cuenta de administrador para "${user}"`)) return;

  try {
    const { error } = await _supabase.from('crm_usuarios_admin').insert([{ usuario: user, contrasena: pass }]);
    if (error) throw error;

    notify(`✅ Cuenta secundaria "${user}" añadida con éxito.`);
    document.getElementById('cfg-new-user').value = '';
    document.getElementById('cfg-new-user-pass').value = '';
    
    // Recargar datos desde Supabase
    const { data } = await _supabase.from('crm_usuarios_admin').select('*');
    if(data) ADMINS = data;

    renderConfiguracionTab();
  } catch (err) {
    console.error(err);
    alert("❌ Error al insertar el usuario adicional en Supabase.");
  }
}

async function eliminarCuentaAdmin(id, usuario) {
  if (!solicitarYValidarContrasena(`Eliminar permanentemente los accesos de "${usuario}"`)) return;

  try {
    const { error } = await _supabase.from('crm_usuarios_admin').delete().eq('id', id);
    if (error) throw error;

    notify("🗑 Administrador secundario eliminado.");
    
    // Recargar lista
    const { data } = await _supabase.from('crm_usuarios_admin').select('*');
    if(data) ADMINS = data;

    renderConfiguracionTab();
  } catch (err) {
    console.error(err);
    alert("❌ No se pudo eliminar la cuenta secundaria.");
  }
}

async function agregarElementoConfig(tipo, idInput) {
  const input = document.getElementById(idInput);
  if (!input) return;
  const valor = input.value.trim();

  if (!valor) {
    alert("⚠️ El valor no puede estar vacío.");
    return;
  }

  if (!solicitarYValidarContrasena(`Añadir "${valor}" a la lista de opciones de ${tipo}`)) return;

  try {
    const { error } = await _supabase.from('crm_configuraciones').insert([{ tipo: tipo, valor: valor }]);
    if (error) throw error;

    notify(`✅ "${valor}" añadido correctamente.`);
    input.value = '';

    // Actualizar e integrar en el array correspondiente local en caliente
    if (tipo === 'fuente') FUENTES.push(valor);
    if (tipo === 'producto') PRODUCTOS.push(valor);
    if (tipo === 'presupuesto') PRESUPUESTOS.push(valor);
    if (tipo === 'estado') ESTADOS_PIPELINE.push(valor);

    renderConfiguracionTab();
    llenarSelectsFormularioLeads();
  } catch (err) {
    console.error(err);
    alert("❌ Error al guardar la nueva configuración en Supabase.");
  }
}

// ─── UTILIDADES OPERATIVAS Y VENTANAS FLOTANTES ────────────────────────────────
function notify(msg) {
  const notif = document.getElementById('notification');
  if(!notif) return;
  notif.textContent = msg;
  notif.classList.add('show');
  setTimeout(() => { notif.classList.remove('show'); }, 3500);
}

function verifySeguimientosHoy(leads) {
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

function exportCSV() {
  if (LEADS.length === 0) return;
  let csv = "ID,Nombre,Empresa,Telefono,Correo,Ciudad,EstadoRep,Fuente,Producto,Presupuesto,Responsable,Prioridad,EstadoPipeline,ProximoSeg\\n";
  LEADS.forEach(l => {
    csv += `\"${l.id}\",\"${l.nombre}\",\"${l.empresa || ''}\",\"${l.telefono || ''}\",\"${l.correo || ''}\",\"${l.ciudad || ''}\",\"${l.estado_rep || ''}\",\"${l.fuente}\",\"${l.producto}\",\"${l.presupuesto}\",\"${l.responsable}\",\"${l.prioridad}\",\"${l.estado || 'Nuevo'}\",\"${l.proximoseg || ''}\"\\n`;
  });
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `Leads_Herbolaria_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function togglePanel(show) {
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('panel');
  if (overlay && panel) {
    if (show) {
      overlay.style.display = 'block';
      setTimeout(() => {
        overlay.classList.add('active');
        panel.classList.add('active');
      }, 10);
    } else {
      overlay.classList.remove('active');
      panel.classList.remove('active');
      setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }
  }
}

function closePanel(e) {
  if (e && e.target.id === 'overlay') {
    togglePanel(false);
  }
}

// ─── DETONACIÓN AL CARGAR LA VENTANA VIGENTE ──────────────────────────────────
window.onload = function() {
  fetchConfiguraciones().then(() => {
    if (sessionStorage.getItem('crm_logged_in') === 'true') {
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('main-layout').style.display = 'block';
      inicializarCRM();
    }
  });
};
