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

// CREDENCIALES EXCLUSIVAS LOCALES ACTUALIZADAS
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

// ─── BASE DE DATOS (SUPABASE) ──────────────────────────────────────────────────
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
  } catch (err) {
    console.error('Error al cargar leads:', err.message);
    notify('❌ Error al conectar con la base de datos', 'danger');
  }
}

function subscribeToLeadsRealtime() {
  if (!supabaseClient) return;
  supabaseClient
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      (payload) => {
        fetchLeadsFromSupabase();
      }
    )
    .subscribe();
}

// ─── AUTENTICACIÓN LOCAL ──────────────────────────────────────────────────────
function handleLogin() {
  const userVal = document.getElementById('username').value.trim();
  const passVal = document.getElementById('password').value;

  const isPrimary = (userVal.toLowerCase() === AUTH_USER.toLowerCase() && passVal === AUTH_PASS);
  const isExtra = ADMINS.some(admin => admin.user.toLowerCase() === userVal.toLowerCase() && admin.pass === passVal);

  if (isPrimary || isExtra) {
    sessionStorage.setItem('crm_logged_in', 'true');
    sessionStorage.setItem('crm_user_role', isPrimary ? 'Primary' : 'SubAdmin');
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    
    fetchLeadsFromSupabase();
    subscribeToLeadsRealtime();
  } else {
    alert('❌ Usuario o contraseña incorrectos.');
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
  if (promptPass === AUTH_PASS) return true;
  
  alert('❌ Acción cancelada: Contraseña incorrecta o no autorizada.');
  return false;
}

// ─── RENDERIZACIÓN DEL DASHBOARD ──────────────────────────────────────────────
function renderDashboard() {
  let filtered = LEADS.filter(lead => {
    const term = filterSearch.toLowerCase();
    const matchText = (lead.nombre || '').toLowerCase().includes(term) ||
                      (lead.empresa || '').toLowerCase().includes(term) ||
                      (lead.telefono || '').toLowerCase().includes(term) ||
                      (lead.correo || '').toLowerCase().includes(term);
    
    const matchEst = (filterEstado === 'Todos' || lead.estadolead === filterEstado);
    const matchEjec = (filterEjecutivo === 'Todos' || lead.ejecutivo === filterEjecutivo);
    
    return matchText && matchEst && matchEjec;
  });

  document.getElementById('total-leads').innerText = filtered.length;
  
  const nuevos = filtered.filter(l => l.estadolead === 'Nuevo').length;
  document.getElementById('leads-nuevos').innerText = nuevos;

  const potencial = filtered.reduce((acc, curr) => acc + (Number(curr.montopotencial) || 0), 0);
  document.getElementById('monto-potencial').innerText = '$' + potencial.toLocaleString('es-MX');

  const cerrado = filtered.reduce((acc, curr) => acc + (Number(curr.montocerrado) || 0), 0);
  document.getElementById('monto-cerrado').innerText = '$' + cerrado.toLocaleString('es-MX');

  renderTableContent(filtered);
  renderKanbanContent(filtered);
}

function renderTableContent(list) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">No hay leads que coincidan con los filtros.</td></tr>`;
    return;
  }

  list.forEach(lead => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${lead.nombre || '-'}</strong><br><small class="text-muted">${lead.empresa || '-'}</small></td>
      <td>${lead.telefono || '-'}<br><small class="text-muted">${lead.correo || '-'}</small></td>
      <td><span class="badge bg-light text-dark border">${lead.fuente || 'No definida'}</span></td>
      <td><small>${lead.producto || '-'}</small></td>
      <td><strong>$${(Number(lead.montopotencial) || 0).toLocaleString('es-MX')}</strong></td>
      <td><small class="text-secondary">${lead.ejecutivo || 'No asignado'}</small></td>
      <td><span class="badge ${getStatusBadgeClass(lead.estadolead)}">${lead.estadolead || 'Nuevo'}</span></td>
      <td><small>${lead.proximoseg || '-'}</small></td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" onclick="openEditLeadModal('${lead.id}')" title="Editar"><i class="bi bi-pencil-square"></i></button>
          <button class="btn btn-outline-danger" onclick="deleteLeadData('${lead.id}')" title="Eliminar"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderKanbanContent(list) {
  const columns = {
    'Nuevo': document.getElementById('kanban-nuevo'),
    'En Seguimiento': document.getElementById('kanban-seguimiento'),
    'Demostración / Muestra': document.getElementById('kanban-demo'),
    'Negociación': document.getElementById('kanban-negociacion'),
    'Cerrado Ganado': document.getElementById('kanban-ganado'),
    'Cerrado Perdido': document.getElementById('kanban-perdido')
  };

  Object.values(columns).forEach(col => { if(col) col.innerHTML = ''; });

  list.forEach(lead => {
    const colContainer = columns[lead.estadolead];
    if (!colContainer) return;

    const card = document.createElement('div');
    card.className = `kanban-card border-start border-4 ${getPriorityBorderClass(lead.prioridad)}`;
    card.style = "background: #fdfdfd; padding: 10px; margin-bottom: 8px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-left: 4px solid;";
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-1">
        <h6 class="mb-0 text-truncate" style="max-width: 80%; margin:0;">${lead.nombre}</h6>
        <span class="priority-dot bg-${getPriorityColor(lead.prioridad)}" title="Prioridad ${lead.prioridad}" style="display:inline-block; width:8px; height:8px; border-radius:50%;"></span>
      </div>
      <div class="text-muted small text-truncate mb-2">${lead.empresa || 'Sin empresa'}</div>
      <div class="d-flex justify-content-between align-items-center small mt-2">
        <span class="text-primary font-monospace fw-bold">$${(Number(lead.montopotencial) || 0).toLocaleString('es-MX')}</span>
        <span class="text-secondary text-truncate" style="max-width: 60%; font-size:11px;"><i class="bi bi-person"></i> ${lead.ejecutivo ? lead.ejecutivo.split(' - ')[0] : 'S/A'}</span>
      </div>
      <div class="d-flex justify-content-end mt-2 pt-1 border-top" style="font-size: 11px;">
        <a href="javascript:void(0)" class="text-primary me-2" onclick="openEditLeadModal('${lead.id}')"><i class="bi bi-pencil"></i> Editar</a>
      </div>
    `;
    colContainer.appendChild(card);
  });

  Object.keys(columns).forEach(key => {
    const col = columns[key];
    if(col && col.children.length === 0) {
      col.innerHTML = `<div class="text-center text-muted my-3 small p-2" style="border: 1px dashed #ddd; border-radius:4px;">Sin leads</div>`;
    }
  });
}

// ─── ACCIONES EN SUPABASE ─────────────────────────────────────────────────────
async function handleLeadFormSubmit(e) {
  e.preventDefault();
  if(!supabaseClient) return;

  const leadData = {
    nombre: document.getElementById('lead-nombre').value.trim(),
    empresa: document.getElementById('lead-empresa').value.trim() || null,
    telefono: document.getElementById('lead-telefono').value.trim() || null,
    correo: document.getElementById('lead-correo').value.trim() || null,
    ciudad: document.getElementById('lead-ciudad').value.trim() || null,
    estado_geo: document.getElementById('lead-estado-geo').value || null,
    fuente: document.getElementById('lead-fuente').value || null,
    producto: document.getElementById('lead-producto').value || null,
    presupuestos: document.getElementById('lead-presupuesto').value || null,
    responsable: document.getElementById('lead-responsable').value || null,
    ejecutivo: document.getElementById('lead-ejecutivo').value || null,
    estadolead: document.getElementById('lead-estado').value,
    prioridad: document.getElementById('lead-prioridad').value,
    proximoseg: document.getElementById('lead-proximo-seg').value || null,
    montopotencial: parseInt(document.getElementById('lead-monto-potencial').value) || 0,
    montocerrado: parseInt(document.getElementById('lead-monto-cerrado').value) || 0,
    notasventas: document.getElementById('lead-notas-ventas').value.trim() || null,
    notasgerencia: document.getElementById('lead-notas-gerencia').value.trim() || null,
    ultimaactualizacion: new Date().toLocaleString('es-MX')
  };

  try {
    if (currentEditId) {
      const { error } = await supabaseClient
        .from('leads')
        .update(leadData)
        .eq('id', currentEditId);

      if (error) throw error;
      notify('🔄 Lead actualizado exitosamente en la nube');
    } else {
      const { error } = await supabaseClient
        .from('leads')
        .insert([leadData]);

      if (error) throw error;
      notify('✅ Nuevo Lead registrado exitosamente en la nube', 'success');
    }

    closeLeadModal();
    document.getElementById('lead-form').reset();
    currentEditId = null;

  } catch (err) {
    console.error('Error al guardar lead:', err.message);
    alert('❌ Ocurrió un error al guardar los datos en Supabase.');
  }
}

async function deleteLeadData(id) {
  if (!supabaseClient || !checkPasswordPrompt('Eliminar este registro de lead de forma permanente')) return;
  
  if (confirm('¿Estás completamente seguro de eliminar este lead?')) {
    try {
      const { error } = await supabaseClient
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      notify('🗑 Lead eliminado de la base de datos central', 'warning');
    } catch (err) {
      console.error('Error al eliminar lead:', err.message);
      alert('❌ Error al intentar eliminar de Supabase.');
    }
  }
}

function openEditLeadModal(id) {
  const lead = LEADS.find(l => String(l.id) === String(id));
  if (!lead) return;

  currentEditId = id;
  document.getElementById('leadModalLabel').innerText = 'Editar Lead';

  document.getElementById('lead-nombre').value = lead.nombre || '';
  document.getElementById('lead-empresa').value = lead.empresa || '';
  document.getElementById('lead-telefono').value = lead.telefono || '';
  document.getElementById('lead-correo').value = lead.correo || '';
  document.getElementById('lead-ciudad').value = lead.ciudad || '';
  document.getElementById('lead-estado-geo').value = lead.estado_geo || '';
  
  populateSelectOptions(); 

  document.getElementById('lead-fuente').value = lead.fuente || '';
  document.getElementById('lead-producto').value = lead.producto || '';
  document.getElementById('lead-presupuesto').value = lead.presupuestos || '';
  document.getElementById('lead-responsable').value = lead.responsable || '';
  document.getElementById('lead-ejecutivo').value = lead.ejecutivo || '';
  document.getElementById('lead-estado').value = lead.estadolead || 'Nuevo';
  document.getElementById('lead-prioridad').value = lead.prioridad || 'Media';
  document.getElementById('lead-proximo-seg').value = lead.proximoseg || '';
  document.getElementById('lead-monto-potencial').value = lead.montopotencial || 0;
  document.getElementById('lead-monto-cerrado').value = lead.montocerrado || 0;
  document.getElementById('lead-notas-ventas').value = lead.notasventas || '';
  document.getElementById('lead-notas-gerencia').value = lead.notasgerencia || '';

  document.getElementById('leadModal').style.display = 'flex';
}

function openCreateLeadModal() {
  currentEditId = null;
  document.getElementById('leadModalLabel').innerText = 'Nuevo Lead';
  document.getElementById('lead-form').reset();
  populateSelectOptions();
  document.getElementById('leadModal').style.display = 'flex';
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Nuevo': return 'badge bg-info text-dark';
    case 'En Seguimiento': return 'badge bg-primary text-white';
    case 'Demostración / Muestra': return 'badge bg-warning text-dark';
    case 'Negociación': return 'badge bg-dark text-light';
    case 'Cerrado Ganado': return 'badge bg-success text-white';
    case 'Cerrado Perdido': return 'badge bg-danger text-white';
    default: return 'badge bg-secondary text-white';
  }
}

function getPriorityBorderClass(prio) {
  switch (prio) {
    case 'Alta': return 'border-danger';
    case 'Media': return 'border-warning';
    case 'Baja': return 'border-success';
    default: return 'border-secondary';
  }
}

function getPriorityColor(prio) {
  if (prio === 'Alta') return 'danger';
  if (prio === 'Media') return 'warning';
  return 'success';
}

function setupFilterListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterSearch = e.target.value;
      renderDashboard();
    });
  }

  const selectEstado = document.getElementById('filter-estado');
  if (selectEstado) {
    selectEstado.addEventListener('change', (e) => {
      filterEstado = e.target.value;
      renderDashboard();
    });
  }

  const selectExecutive = document.getElementById('filter-ejecutivo');
  if (selectExecutive) {
    selectExecutive.addEventListener('change', (e) => {
      filterEjecutivo = e.target.value;
      renderDashboard();
    });
  }
}

function populateSelectOptions() {
  const fSelect = document.getElementById('lead-fuente');
  if (fSelect) {
    fSelect.innerHTML = '<option value="">Seleccione...</option>';
    FUENTES.forEach(f => fSelect.innerHTML += `<option value="${f}">${f}</option>`);
  }

  const pSelect = document.getElementById('lead-producto');
  if (pSelect) {
    pSelect.innerHTML = '<option value="">Seleccione...</option>';
    PRODUCTOS.forEach(p => pSelect.innerHTML += `<option value="${p}">${p}</option>`);
  }

  const bSelect = document.getElementById('lead-presupuesto');
  if (bSelect) {
    bSelect.innerHTML = '<option value="">Seleccione...</option>';
    PRESUPUESTOS.forEach(b => bSelect.innerHTML += `<option value="${b}">${b}</option>`);
  }

  const rSelect = document.getElementById('lead-responsable');
  if (rSelect) {
    rSelect.innerHTML = '<option value="">Seleccione...</option>';
    RESPONSABLES.forEach(r => rSelect.innerHTML += `<option value="${r}">${r}</option>`);
  }

  const eSelect = document.getElementById('lead-ejecutivo');
  const filterEjec = document.getElementById('filter-ejecutivo');
  if (eSelect) {
    eSelect.innerHTML = '<option value="">Seleccione...</option>';
    if (filterEjec) filterEjec.innerHTML = '<option value="Todos">Todos los Ejecutivos</option>';
    
    EJECUTIVOS.forEach(e => {
      eSelect.innerHTML += `<option value="${e}">${e}</option>`;
      if (filterEjec) filterEjec.innerHTML += `<option value="${e}">${e}</option>`;
    });
  }
}

function notify(message, type = 'primary') {
  const container = document.getElementById('notification-container') || document.body;
  const toast = document.createElement('div');
  toast.className = `alert alert-${type} alert-dismissible fade show shadow position-fixed bottom-0 end-0 m-3`;
  toast.style = "z-index: 9999; min-width: 250px; background: #fff; padding: 15px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-left: 5px solid #20c997;";
  toast.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>${message}</div>
      <button type="button" style="border:none; background:transparent; font-size:16px; cursor:pointer;" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3500);
}

function saveConfigStorage() {
  localStorage.setItem('cfg_admins', JSON.stringify(ADMINS));
  localStorage.setItem('cfg_fuentes', JSON.stringify(FUENTES));
  localStorage.setItem('cfg_productos', JSON.stringify(PRODUCTOS));
  localStorage.setItem('cfg_presupuestos', JSON.stringify(PRESUPUESTOS));
  localStorage.setItem('cfg_responsables', JSON.stringify(RESPONSABLES));
  localStorage.setItem('cfg_ejecutives', JSON.stringify(EJECUTIVOS));
}

function renderConfig() {
  const listAdmins = document.getElementById('cfg-list-admins');
  if (listAdmins) {
    listAdmins.innerHTML = '';
    ADMINS.forEach((adm, i) => {
      listAdmins.innerHTML += `<li style="display:flex; justify-content:space-between; margin-bottom:5px;">
        <span><strong>${adm.user}</strong> (Adicional)</span>
        <div>
          <button class="btn btn-sm" onclick="startEditAdmin(${i})">✏️</button>
          <button class="btn btn-sm" onclick="removeAdminUser(${i})">🗑️</button>
        </div>
      </li>`;
    });
  }

  renderGenericConfigList('cfg-list-fuentes', FUENTES, 'FUENTES');
  renderGenericConfigList('cfg-list-productos', PRODUCTOS, 'PRODUCTOS');
  renderGenericConfigList('cfg-list-ejecutivos', EJECUTIVOS, 'EJECUTIVOS');

  populateSelectOptions();
}

function renderGenericConfigList(elementId, array, arrayName) {
  const listEl = document.getElementById(elementId);
  if (!listEl) return;
  listEl.innerHTML = '';
  array.forEach((item, index) => {
    listEl.innerHTML += `<li style="display:flex; justify-content:space-between; margin-bottom:3px;">
      <span>${item}</span>
      <button style="border:none; background:transparent; cursor:pointer;" onclick="removeConfigItem('${arrayName}', ${index})">❌</button>
    </li>`;
  });
}

function addConfigItem(arrayName, inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;

  if (!checkPasswordPrompt(`Agregar el elemento "${val}" a la configuración global`)) return;

  if (arrayName === 'FUENTES') FUENTES.push(val);
  else if (arrayName === 'PRODUCTOS') PRODUCTOS.push(val);
  else if (arrayName === 'EJECUTIVOS') EJECUTIVOS.push(val);

  input.value = '';
  saveConfigStorage();
  renderConfig();
  notify('➕ Elemento agregado a la configuración');
}

function removeConfigItem(arrayName, index) {
  if (!checkPasswordPrompt('Eliminar un elemento de la configuración global')) return;

  if (arrayName === 'FUENTES') FUENTES.splice(index, 1);
  else if (arrayName === 'PRODUCTOS') PRODUCTOS.splice(index, 1);
  else if (arrayName === 'EJECUTIVOS') EJECUTIVOS.splice(index, 1);

  saveConfigStorage();
  renderConfig();
  notify('🗑 Elemento removido del catálogo', 'warning');
}

function saveAdminUser(e) {
  e.preventDefault();
  const userVal = document.getElementById('cfg-admin-user').value.trim();
  const passVal = document.getElementById('cfg-admin-pass').value;
  if (!userVal || !passVal) return;

  if (userVal.toLowerCase() === AUTH_USER.toLowerCase()) {
    alert('❌ No puedes usar el nombre de la cuenta maestra principal.');
    return;
  }

  if (editingAdminIndex !== null) {
    updateAdminUser(userVal, passVal);
    return;
  }

  const existe = ADMINS.some(admin => admin.user.toLowerCase() === userVal.toLowerCase());
  if (existe) {
    alert('❌ Ese nombre de usuario ya está registrado.');
    return;
  }

  if (!checkPasswordPrompt(`Crear accesos para el nuevo administrador "${userVal}"`)) return;

  ADMINS.push({ user: userVal, pass: passVal });
  document.getElementById('admin-form').reset();
  saveConfigStorage();
  renderConfig();
  notify('👥 Nuevo administrador adicional guardado correctamente', 'success');
}

function startEditAdmin(index) {
  editingAdminIndex = index;
  const adm = ADMINS[index];
  document.getElementById('cfg-admin-user').value = adm.user;
  document.getElementById('cfg-admin-pass').value = adm.pass;
  document.getElementById('btn-admin-submit').innerText = 'Actualizar Usuario';
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
  document.getElementById('btn-admin-submit').innerText = 'Guardar Usuario';
  document.getElementById('admin-form').reset();

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

// ─── INIT PRINCIPAL ───────────────────────────────────────────────────────────
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

  const leadForm = document.getElementById('lead-form');
  if (leadForm) leadForm.addEventListener('submit', handleLeadFormSubmit);

  const adminForm = document.getElementById('admin-form');
  if (adminForm) adminForm.addEventListener('submit', saveAdminUser);

  setupFilterListeners();
  renderConfig();
};
