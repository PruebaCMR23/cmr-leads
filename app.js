// ─── CONFIGURACIÓN DE CONEXIÓN CON SUPABASE ───────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

// CREDENCIALES EXCLUSIVAS ACTUALIZADAS
const AUTH_USER = "Herbolaria";
const AUTH_PASS = "Saludable*"; 

// Arreglos globales dinámicos vinculados
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
const PRIORIDADES = ['Alta', 'Media', 'Baja'];
const ESTADOS = ['Nuevo', 'Contactado', 'Calificado', 'Propuesta Enviada', 'En Negociación', 'Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'];

let LEADS = [];
let currentLeadId = null;

// Colores variados para las gráficas de barra horizontales del dashboard
const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

// ─── PETICIONES SUPABASE API ──────────────────────────────────────────────────
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
    if (!res.ok) throw new Error(`Error en API HTTP: ${res.status}`);
    return res.status === 204 ? true : await res.json();
  } catch (err) {
    console.error(`❌ Error Supabase en [${endpoint}]:`, err);
    return null;
  }
}

// Cargar catálogos dinámicos
async function cargarConfiguracionesBase() {
  const fData = await supabaseRequest('config_fuentes?select=*');
  FUENTES = fData && fData.length > 0 ? fData.map(x => x.nombre) : ['Facebook Ads', 'Instagram Ads', 'WhatsApp', 'Página Web'];
  
  const pData = await supabaseRequest('config_productos?select=*');
  PRODUCTOS = pData && pData.length > 0 ? pData.map(x => x.nombre) : ['Cápsulas Herbolarias', 'Tés Medicinales', 'Jarabe Inmune'];

  const prData = await supabaseRequest('config_presupuestos?select=*');
  PRESUPUESTOS = prData && prData.length > 0 ? prData.map(x => x.nombre) : ['< $5,000', '$5,000 - $15,000', '> $15,000'];
}

// Obtener registros de leads limpios de la nube
async function fetchLeads() {
  const data = await supabaseRequest('crm_leads?select=*&order=id.desc');
  LEADS = data || [];
  renderDashboard();
  revisarSeguimientosHoy(LEADS);
}

// ─── CONTROL DEL LOGIN ACCESO ─────────────────────────────────────────────────
function handleLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  const errorDiv = document.getElementById('login-error');

  if (user === AUTH_USER && pass === AUTH_PASS) {
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

// ─── CONTROL DE ANIMACIÓN PANEL LATERAL (OCULTO/VISIBLE DRAWER) ──────────────
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

function closePanel(e) {
  if (e && e.target.id === 'overlay') {
    togglePanel(false);
  }
}

// Llenar menús desplegables
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
  arrayData.forEach(v => {
    html += `<option value="${v}">${v}</option>`;
  });
  el.innerHTML = html;
}

function limpiarCamposFormulario() {
  ['n-nombre', 'n-empresa', 'n-telefono', 'n-correo', 'n-ciudad', 'n-estado', 'n-seg', 'n-notas'].forEach(id => {
    const field = document.getElementById(id);
    if (field) field.value = '';
  });
  ['n-fuente', 'n-producto', 'n-presupuesto', 'n-responsable', 'n-prioridad', 'n-situacion'].forEach(id => {
    const field = document.getElementById(id);
    if (field) field.selectedIndex = 0;
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
  
  if (lead.proximoseg) {
    document.getElementById('n-seg').value = lead.proximoseg.substring(0, 16);
  } else {
    document.getElementById('n-seg').value = '';
  }
  document.getElementById('n-notas').value = lead.notas || '';
}

// Guardar y procesar datos del formulario
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
  if (!confirm("⚠️ ¿Estás completamente seguro de eliminar este Prospecto?")) return;

  const res = await supabaseRequest(`crm_leads?id=eq.${currentLeadId}`, 'DELETE');
  if (res) notify("🗑 Registro eliminado del CRM.");

  togglePanel(false);
  fetchLeads();
}

// ─── RENDERIZADO COMPLETO DEL DASHBOARD Y LOS GRÁFICOS HORIZONTALES ────────────
function renderDashboard() {
  // Cálculo de Métricas en Ceros por Defecto
  const total = LEADS.length;
  const ganados = LEADS.filter(l => l.estado === 'Cerrado Ganado').length;
  const perdidos = LEADS.filter(l => l.estado === 'Cerrado Perdido').length;
  const abandonados = LEADS.filter(l => l.estado === 'Abandonado').length;
  
  const tasa = total > 0 ? Math.round((ganados / total) * 100) : 0;
  
  // Calcular Seg. Vencidos
  const hoy = new Date();
  const vencidos = LEADS.filter(l => {
    if (!l.proximoseg || l.estado === 'Cerrado Ganado' || l.estado === 'Cerrado Perdido' || l.estado === 'Abandonado') return false;
    return new Date(l.proximoseg) < hoy;
  }).length;

  // Calcular montos acumulados
  let montoCerradoTotal = 0;
  let pipelinePotencialTotal = 0;

  LEADS.forEach(l => {
    const valor = extraerNumeroMonto(l.presupuesto);
    if (l.estado === 'Cerrado Ganado') {
      montoCerradoTotal += valor;
    } else if (l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado') {
      pipelinePotencialTotal += valor;
    }
  });

  // Asignar los valores calculados en las etiquetas HTML
  document.getElementById('m-total').textContent = total;
  document.getElementById('m-ganados').textContent = ganados;
  document.getElementById('m-tasa').textContent = `${tasa}%`;
  document.getElementById('m-monto-cerrado').textContent = `$${montoCerradoTotal.toLocaleString('es-MX')}`;
  document.getElementById('m-monto-potencial').textContent = `$${pipelinePotencialTotal.toLocaleString('es-MX')}`;
  document.getElementById('m-vencidos').textContent = vencidos;
  document.getElementById('m-abandonados').textContent = abandonados;
  document.getElementById('m-perdidos').textContent = perdidos;

  // Renderizar Gráficas de Barras
  construirBarrasGrafica('chart-fuente', agruparPorClave(LEADS, 'fuente'));
  construirBarrasGrafica('chart-estado', agruparPorClave(LEADS, 'estado'));
  construirBarrasGrafica('chart-responsable', agruparPorClave(LEADS, 'responsable'));
  construirBarrasGrafica('chart-producto', agruparPorClave(LEADS, 'producto'));

  // Cargar Tabla Inferior
  renderTablaSeguimientoActivos();
}

function extraerNumeroMonto(str) {
  if (!str) return 0;
  if (str.includes('< 5,000') || str.includes('$5,000')) return 5000;
  if (str.includes('15,000')) return 15000;
  if (str.includes('50,000')) return 50000;
  return 0;
}

function agruparPorClave(leads, clave) {
  const conteo = {};
  leads.forEach(l => {
    const valor = l[clave] || 'Por definir';
    conteo[valor] = (conteo[valor] || 0) + 1;
  });
  return Object.entries(conteo).sort((a, b) => b[1] - a[1]);
}

// Construye barras de colores de forma dinámica
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
    const nombre = item[0];
    const cantidad = item[1];
    const porcentaje = maxVal > 0 ? (cantidad / maxVal) * 100 : 0;
    const color = CHART_COLORS[index % CHART_COLORS.length];

    html += `
      <div class="custom-bar-row">
        <div class="custom-bar-info">
          <span>${nombre}</span>
          <span>${cantidad}</span>
        </div>
        <div class="custom-bar-bg">
          <div class="custom-bar-fill" style="width: ${porcentaje}%; background-color: ${color};"></div>
        </div>
      </div>
    `;
  });

  contenedor.innerHTML = html;
}

function renderTablaSeguimientoActivos() {
  const tbody = document.getElementById('dashboard-table-body');
  if (!tbody) return;

  // Filtrar solo los próximos seguimientos activos agendados
  const activos = LEADS.filter(l => l.proximoseg && l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado');

  if (activos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="no-data-row">No hay seguimientos agendados</td></tr>`;
    return;
  }

  let html = '';
  activos.forEach(l => {
    const fStr = new Date(l.proximoseg).toLocaleString('es-MX', { hour12: false }).substring(0, 16);
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

// Control global de cambio de vista en pestañas
function switchTab(target, tabElement) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  tabElement.classList.add('active');

  ['tab-dashboard', 'tab-leads', 'tab-seguimiento', 'tab-reportes', 'tab-config'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
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
    const f = new Date(l.proximoseg);
    return f.toLocaleDateString('es-MX') === hoyStr && l.estado !== 'Cerrado Ganado' && l.estado !== 'Cerrado Perdido' && l.estado !== 'Abandonado';
  }) : [];

  if (hoyLeads.length > 0) {
    setTimeout(() => {
      alert(`📢 ¡Recordatorio de Ventas!\nTienes (${hoyLeads.length}) seguimientos agendados para el día de hoy.`);
    }, 1000);
  }
}

function exportCSV() {
  if (LEADS.length === 0) {
    alert("No hay registros en Supabase para exportar.");
    return;
  }
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

// Inicialización de la persistencia de la sesión
window.onload = function() {
  if (sessionStorage.getItem('crm_logged_in') === 'true') {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    inicializarSistema();
  }
};
