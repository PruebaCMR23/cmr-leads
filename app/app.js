// ─── CREDENCIALES DE CONEXIÓN CON SUPABASE ────────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

let supabaseClient;

function initSupabase() {
  if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return true;
  } else {
    console.error("La librería global de Supabase no ha cargado correctamente.");
    return false;
  }
}

// CREDENCIALES EXCLUSIVAS LOCALES
const AUTH_USER = "Herbolaria";
const AUTH_PASS = "Saludable*";

let ADMINS = JSON.parse(localStorage.getItem('cfg_admins')) || [];
let editingAdminIndex = null; 

let FUENTES = JSON.parse(localStorage.getItem('cfg_fuentes')) || [];
let PRODUCTOS = JSON.parse(localStorage.getItem('cfg_productos')) || [];
let PRESUPUESTOS = JSON.parse(localStorage.getItem('cfg_presupuestos')) || [];

let RESPONSABLES = JSON.parse(localStorage.getItem('cfg_responsables')) || ['Marketing Digital', 'Ventas Online', 'Gerencia de Ventas', 'Gerencia General'];

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

let LEADS = []; 
let currentEditId = null;

let filterSearch = '';
let filterEstado = 'Todos';
let filterEjecutivo = 'Todos';

// ─── MANEJO DEL PANEL LATERAL ORIGINAL ────────────────────────────────────────
function togglePanel(show) {
  const overlay = document.getElementById('overlay');
  const panel = document.getElementById('panel');
  if (show) {
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

// ─── CONSULTAS A SUPABASE ─────────────────────────────────────────────────────
async function fetchLeadsFromSupabase() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    LEADS = data || [];
    renderDashboard();
    renderAllTabViews();
  } catch (err) {
    console.error('Error al cargar leads:', err.message);
  }
}

function subscribeToLeadsRealtime() {
  if (!supabaseClient) return;
  supabaseClient
    .channel('schema-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
      fetchLeadsFromSupabase();
    })
    .subscribe();
}

// ─── AUTENTICACIÓN ────────────────────────────────────────────────────────────
function handleLogin() {
  const userVal = document.getElementById('login-user').value.trim();
  const passVal = document.getElementById('login-pass').value;
  const errorDiv = document.getElementById('login-error');

  const isPrimary = (userVal.toLowerCase() === AUTH_USER.toLowerCase() && passVal === AUTH_PASS);
  const isExtra = ADMINS.some(admin => admin.user.toLowerCase() === userVal.toLowerCase() && admin.pass === passVal);

  if (isPrimary || isExtra) {
    if(errorDiv) errorDiv.style.display = 'none';
    sessionStorage.setItem('crm_logged_in', 'true');
    sessionStorage.setItem('crm_user_role', isPrimary ? 'Primary' : 'SubAdmin');
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    
    fetchLeadsFromSupabase();
    subscribeToLeadsRealtime();
  } else {
    if(errorDiv) {
      errorDiv.innerText = '❌ Usuario o contraseña incorrectos.';
      errorDiv.style.display = 'block';
    } else {
      alert('❌ Usuario o contraseña incorrectos.');
    }
  }
}

function handleLogout() {
  sessionStorage.clear();
  window.location.reload();
}

function checkPasswordPrompt(actionName) {
  const role = sessionStorage.getItem('crm_user_role');
  if (role === 'Primary') return true; 
  const promptPass = prompt(`⚠️ Seguridad: Introduce la contraseña maestra ("${AUTH_USER}") para: ${actionName}`);
  return promptPass === AUTH_PASS;
}

// ─── RENDERIZAR VISTAS COMPLETAS ──────────────────────────────────────────────
function renderAllTabViews() {
  // Vista 1: Dashboard estructural
  const dashContainer = document.getElementById('tab-dashboard');
  if (dashContainer) {
    dashContainer.innerHTML = `
      <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
        <div class="card p-3"><h5>Total Leads</h5><h2 id="total-leads">0</h2></div>
        <div class="card p-3"><h5>Leads Nuevos</h5><h2 id="leads-nuevos">0</h2></div>
        <div class="card p-3"><h5>Monto Potencial</h5><h2 id="monto-potencial">$0</h2></div>
        <div class="card p-3"><h5>Monto Cerrado</h5><h2 id="monto-cerrado">$0</h2></div>
      </div>
      <div class="filters-bar" style="margin-bottom: 20px; display: flex; gap: 10px;">
        <input type="text" id="search-input" placeholder="Buscar por nombre, empresa, teléfono..." class="form-control" style="flex: 1;" value="${filterSearch}">
        <select id="filter-estado" class="form-control">
          <option value="Todos">Todos los Estados</option>
          <option value="Nuevo">Nuevo</option>
          <option value="En Seguimiento">En Seguimiento</option>
          <option value="Demostración / Muestra">Demostración / Muestra</option>
          <option value="Negociación">Negociación</option>
          <option value="Cerrado Ganado">Cerrado Ganado</option>
          <option value="Cerrado Perdido">Cerrado Perdido</option>
        </select>
      </div>
      <div class="content-view">
        <h4>Tabla de Leads</h4>
        <table class="table" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f4f4f4; text-align: left;">
              <th>Lead / Empresa</th><th>Contacto</th><th>Fuente</th><th>Producto</th><th>Monto Potencial</th><th>Ejecutivo</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody id="table-body"></tbody>
        </table>
      </div>
    `;
    setupFilterListeners();
  }

  // Vista 5: Configuración Estructural
  const configContainer = document.getElementById('tab-config');
  if (configContainer) {
    configContainer.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 10px;">
        <div>
          <h5>Catálogo de Fuentes</h5>
          <div style="display:flex; gap:5px; margin-bottom:10px;"><input type="text" id="input-fuente" class="form-control"><button class="btn btn-primary" onclick="addConfigItem('FUENTES', 'input-fuente')">Añadir</button></div>
          <ul id="cfg-list-fuentes"></ul>
        </div>
        <div>
          <h5>Catálogo de Productos</h5>
          <div style="display:flex; gap:5px; margin-bottom:10px;"><input type="text" id="input-producto" class="form-control"><button class="btn btn-primary" onclick="addConfigItem('PRODUCTOS', 'input-producto')">Añadir</button></div>
          <ul id="cfg-list-productos"></ul>
        </div>
      </div>
    `;
    renderConfigLists();
  }

  renderDashboardData();
}

function setupFilterListeners() {
  const s = document.getElementById('search-input');
  if(s) s.addEventListener('input', (e) => { filterSearch = e.target.value; renderDashboardData(); });
  const e = document.getElementById('filter-estado');
  if(e) { e.value = filterEstado; e.addEventListener('change', (evt) => { filterEstado = evt.target.value; renderDashboardData(); }); }
}

function renderDashboardData() {
  let filtered = LEADS.filter(lead => {
    const term = filterSearch.toLowerCase();
    const matchText = (lead.nombre || '').toLowerCase().includes(term) || (lead.empresa || '').toLowerCase().includes(term);
    const matchEst = (filterEstado === 'Todos' || lead.estadolead === filterEstado);
    return matchText && matchEst;
  });

  if(document.getElementById('total-leads')) document.getElementById('total-leads').innerText = filtered.length;
  if(document.getElementById('leads-nuevos')) document.getElementById('leads-nuevos').innerText = filtered.filter(l => l.estadolead === 'Nuevo').length;
  
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  filtered.forEach(lead => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${lead.nombre}</strong><br><small>${lead.empresa || '-'}</small></td>
      <td>${lead.telefono || '-'}<br><small>${lead.correo || '-'}</small></td>
      <td>${lead.fuente || '-'}</td>
      <td>${lead.producto || '-'}</td>
      <td>$${Number(lead.montopotencial || 0).toLocaleString('es-MX')}</td>
      <td>${lead.ejecutivo || '-'}</td>
      <td><span class="badge">${lead.estadolead || 'Nuevo'}</span></td>
      <td>
        <button class="btn btn-primary" style="padding:2px 8px;" onclick="openEditLead('${lead.id}')">Editar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ─── FORMULARIO DINÁMICO DENTRO DEL PANEL ORIGINAL ────────────────────────────
function injectLeadForm(lead = {}) {
  const content = document.getElementById('panel-content');
  if (!content) return;

  content.innerHTML = `
    <form id="lead-form-element" onsubmit="handleLeadSubmit(event)">
      <div class="form-group"><label>Nombre Completo *</label><input type="text" id="form-nombre" class="form-control" required value="${lead.nombre || ''}"></div>
      <div class="form-group"><label>Empresa</label><input type="text" id="form-empresa" class="form-control" value="${lead.empresa || ''}"></div>
      <div class="form-group"><label>Teléfono</label><input type="text" id="form-telefono" class="form-control" value="${lead.telefono || ''}"></div>
      <div class="form-group"><label>Correo Electrónico</label><input type="email" id="form-correo" class="form-control" value="${lead.correo || ''}"></div>
      <div class="form-group"><label>Ciudad</label><input type="text" id="form-ciudad" class="form-control" value="${lead.ciudad || ''}"></div>
      <div class="form-group"><label>Estado Geográfico</label><input type="text" id="form-estado-geo" class="form-control" value="${lead.estado_geo || ''}"></div>
      
      <div class="form-group"><label>Fuente de Origen</label><select id="form-fuente" class="form-control"></select></div>
      <div class="form-group"><label>Producto de Interés</label><select id="form-producto" class="form-control"></select></div>
      <div class="form-group"><label>Área Responsable</label><select id="form-responsable" class="form-control"></select></div>
      <div class="form-group"><label>Ejecutivo Asignado</label><select id="form-ejecutivo" class="form-control"></select></div>
      
      <div class="form-group">
        <label>Estado del Lead</label>
        <select id="form-estadolead" class="form-control">
          <option value="Nuevo">Nuevo</option>
          <option value="En Seguimiento">En Seguimiento</option>
          <option value="Demostración / Muestra">Demostración / Muestra</option>
          <option value="Negociación">Negociación</option>
          <option value="Cerrado Ganado">Cerrado Ganado</option>
          <option value="Cerrado Perdido">Cerrado Perdido</option>
        </select>
      </div>
      <div class="form-group">
        <label>Prioridad</label>
        <select id="form-prioridad" class="form-control">
          <option value="Baja">Baja</option>
          <option value="Media">Media</option>
          <option value="Alta">Alta</option>
        </select>
      </div>
      
      <div class="form-group"><label>Próximo Seguimiento</label><input type="date" id="form-proximoseg" class="form-control" value="${lead.proximoseg || ''}"></div>
      <div class="form-group"><label>Monto Potencial ($)</label><input type="number" id="form-montopotencial" class="form-control" value="${lead.montopotencial || 0}"></div>
      <div class="form-group"><label>Monto Cerrado ($)</label><input type="number" id="form-montocerrado" class="form-control" value="${lead.montocerrado || 0}"></div>
      <div class="form-group"><label>Notas de Ventas</label><textarea id="form-notasventas" class="form-control" rows="2">${lead.notasventas || ''}</textarea></div>
      <div class="form-group"><label>Notas de Gerencia</label><textarea id="form-notasgerencia" class="form-control" rows="2">${lead.notasgerencia || ''}</textarea></div>
      
      <div style="margin-top:20px; display:flex; gap:10px;">
        <button type="submit" class="btn btn-primary" style="flex:1;">Guardar Lead</button>
        ${lead.id ? `<button type="button" class="btn btn-danger" onclick="deleteLead('${lead.id}')">Eliminar</button>` : ''}
      </div>
    </form>
  `;

  // Poblar los selects dinámicos con tus arrays locales
  const selFuente = document.getElementById('form-fuente');
  FUENTES.forEach(f => selFuente.innerHTML += `<option value="${f}" ${lead.fuente === f ? 'selected' : ''}>${f}</option>`);

  const selProd = document.getElementById('form-producto');
  PRODUCTOS.forEach(p => selProd.innerHTML += `<option value="${p}" ${lead.producto === p ? 'selected' : ''}>${p}</option>`);

  const selResp = document.getElementById('form-responsable');
  RESPONSABLES.forEach(r => selResp.innerHTML += `<option value="${r}" ${lead.responsable === r ? 'selected' : ''}>${r}</option>`);

  const selEjec = document.getElementById('form-ejecutivo');
  EJECUTIVOS.forEach(e => selEjec.innerHTML += `<option value="${e}" ${lead.ejecutivo === e ? 'selected' : ''}>${e}</option>`);

  if(lead.estadolead) document.getElementById('form-estadolead').value = lead.estadolead;
  if(lead.prioridad) document.getElementById('form-prioridad').value = lead.prioridad;
}

// ─── ACCIONES DEL USUARIO SOBRE LEADS ─────────────────────────────────────────
function openNewLead() {
  currentEditId = null;
  document.getElementById('panel-title').innerText = "Nuevo Lead";
  injectLeadForm();
  togglePanel(true);
}

function openEditLead(id) {
  const lead = LEADS.find(l => String(l.id) === String(id));
  if(!lead) return;
  currentEditId = id;
  document.getElementById('panel-title').innerText = "Editar Lead";
  injectLeadForm(lead);
  togglePanel(true);
}

async function handleLeadSubmit(e) {
  e.preventDefault();
  if(!supabaseClient) return;

  const dataSave = {
    nombre: document.getElementById('form-nombre').value.trim(),
    empresa: document.getElementById('form-empresa').value.trim() || null,
    telefono: document.getElementById('form-telefono').value.trim() || null,
    correo: document.getElementById('form-correo').value.trim() || null,
    ciudad: document.getElementById('form-ciudad').value.trim() || null,
    estado_geo: document.getElementById('form-estado-geo').value || null,
    fuente: document.getElementById('form-fuente').value || null,
    producto: document.getElementById('form-producto').value || null,
    responsable: document.getElementById('form-responsable').value || null,
    ejecutivo: document.getElementById('form-ejecutivo').value || null,
    estadolead: document.getElementById('form-estadolead').value,
    prioridad: document.getElementById('form-prioridad').value,
    proximoseg: document.getElementById('form-proximoseg').value || null,
    montopotencial: parseInt(document.getElementById('form-montopotencial').value) || 0,
    montocerrado: parseInt(document.getElementById('form-montocerrado').value) || 0,
    notasventas: document.getElementById('form-notasventas').value.trim() || null,
    notasgerencia: document.getElementById('form-notasgerencia').value.trim() || null,
    ultimaactualizacion: new Date().toLocaleString('es-MX')
  };

  try {
    if(currentEditId) {
      const { error } = await supabaseClient.from('leads').update(dataSave).eq('id', currentEditId);
      if(error) throw error;
    } else {
      const { error } = await supabaseClient.from('leads').insert([dataSave]);
      if(error) throw error;
    }
    togglePanel(false);
    fetchLeadsFromSupabase();
  } catch(err) {
    alert('❌ Error al guardar en Supabase: ' + err.message);
  }
}

async function deleteLead(id) {
  if(!checkPasswordPrompt('Eliminar Lead de la nube')) return;
  if(!confirm('¿Seguro que deseas eliminar este registro?')) return;

  try {
    const { error } = await supabaseClient.from('leads').delete().eq('id', id);
    if(error) throw error;
    togglePanel(false);
    fetchLeadsFromSupabase();
  } catch(err) {
    alert('❌ Error al eliminar: ' + err.message);
  }
}

// ─── ADICIONALES DE CONFIGURACIÓN ─────────────────────────────────────────────
function renderConfigLists() {
  const lf = document.getElementById('cfg-list-fuentes');
  if(lf) {
    lf.innerHTML = '';
    FUENTES.forEach((f, i) => lf.innerHTML += `<li>${f} <button onclick="removeConfigItem('FUENTES', ${i})">×</button></li>`);
  }
  const lp = document.getElementById('cfg-list-productos');
  if(lp) {
    lp.innerHTML = '';
    PRODUCTOS.forEach((p, i) => lp.innerHTML += `<li>${p} <button onclick="removeConfigItem('PRODUCTOS', ${i})">×</button></li>`);
  }
}

function addConfigItem(type, inputId) {
  const input = document.getElementById(inputId);
  const val = input ? input.value.trim() : '';
  if(!val) return;

  if(type === 'FUENTES') FUENTES.push(val);
  if(type === 'PRODUCTOS') PRODUCTOS.push(val);

  localStorage.setItem('cfg_fuentes', JSON.stringify(FUENTES));
  localStorage.setItem('cfg_productos', JSON.stringify(PRODUCTOS));
  renderAllTabViews();
}

function removeConfigItem(type, index) {
  if(type === 'FUENTES') FUENTES.splice(index, 1);
  if(type === 'PRODUCTOS') PRODUCTOS.splice(index, 1);

  localStorage.setItem('cfg_fuentes', JSON.stringify(FUENTES));
  localStorage.setItem('cfg_productos', JSON.stringify(PRODUCTOS));
  renderAllTabViews();
}

// ─── INICIALIZACIÓN AUTOMÁTICA ────────────────────────────────────────────────
window.onload = function() {
  initSupabase();

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
