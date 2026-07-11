// ─── CONFIGURACIÓN DE CONEXIÓN CON SUPABASE ───────────────────────────────────
const SUPABASE_URL = "https://cbujbplkjogntjaoooqj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWpicGxram9nbnRqYW9vb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzkxODIsImV4cCI6MjA5OTExNTE4Mn0.kcpmcKS4uOYSRk_0a96TOnDauF5YM3qHVw7Iy5tEy0M";

// CREDENCIALES EXCLUSIVAS ORIGINALES REQUERIDAS
const AUTH_USER = "Herbolaria";
const AUTH_PASS = "Saludable*";

// Variables globales de control (Originales, sin inicializadores locales)
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
let LEADS = [];
let editingLeadId = null;
let editingAdminIndex = null;

// ARRAYS ESTÁTICOS ORIGINALES COMPLETAMENTE INTACTOS
const ESTADOS = ['Nuevo', 'Contactado', 'Calificado', 'Propuesta Enviada', 'En Negociación', 'Cerrado Ganado', 'Cerrado Perdido', 'Abandonado'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

const STATUS_CLASS = {
  'Nuevo': 'b-nuevo', 'Contactado': 'b-contactado', 'Calificado': 'b-calificado',
  'Propuesta Enviada': 'b-propuesta', 'En Negociación': 'b-negociacion',
  'Cerrado Ganado': 'b-cerrado', 'Cerrado Perdido': 'b-perdido', 'Abandonado': 'b-abandonado'
};
const PRI_CLASS = { 'Alta': 'b-alta', 'Media': 'b-media', 'Baja': 'b-baja' };
const BAR_COLORS = ['#378ADD', '#1D9E75', '#D85A30', '#D4537E', '#7F77DD', '#639922', '#BA7517', '#E24B4A', '#888780', '#0F6E56'];
const ESTADO_COLORS = {
  'Nuevo': '#378ADD', 'Contactado': '#7F77DD', 'Calificado': '#639922',
  'Propuesta Enviada': '#BA7517', 'En Negociación': '#D4537E',
  'Cerrado Ganado': '#1D9E75', 'Cerrado Perdido': '#E24B4A', 'Abandonado': '#888780'
};

// ─── FUNCIONES DE CONEXIÓN ASÍNCRONA (REEMPLAZO DE LOCALSTORAGE) ─────────────────
async function cargarDatosDesdeSupabase() {
  try {
    // 1. Cargar Configuración de la cuenta
    const resConfig = await fetch(`${SUPABASE_URL}/rest/v1/configuracion?select=*`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    const dataConfig = await resConfig.json();
    if (dataConfig && dataConfig.length > 0) {
      const config = dataConfig[0];
      ADMINS = config.admins || [];
      FUENTES = config.fuentes || [];
      PRODUCTOS = config.productos || [];
      PRESUPUESTOS = config.presupuestos || [];
      if (config.responsables && config.responsables.length > 0) RESPONSABLES = config.responsables;
      if (config.ejecutives && config.ejecutives.length > 0) EJECUTIVOS = config.ejecutives;
    }

    // 2. Cargar Leads
    const resLeads = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=*&order=id.asc`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    LEADS = await resLeads.json();
  } catch (err) {
    console.error("Error cargando datos de Supabase:", err);
  }
}

async function guardarConfiguracionEnSupabase() {
  try {
    const payload = {
      admins: ADMINS,
      fuentes: FUENTES,
      productos: PRODUCTOS,
      presupuestos: PRESUPUESTOS,
      responsables: RESPONSABLES,
      ejecutives: EJECUTIVOS
    };
    await fetch(`${SUPABASE_URL}/rest/v1/configuracion?id=eq.1`, {
      method: 'PATCH',
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Error guardando configuración en Supabase:", err);
  }
}

async function guardarLeadEnSupabase(leadData, esNuevo = false) {
  try {
    const headers = {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };

    if (esNuevo) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(leadData)
      });
      const nuevoLeadGuardado = await res.json();
      if (nuevoLeadGuardado && nuevoLeadGuardado.length > 0) {
        // Asignar el ID real devuelto por la base de datos
        leadData.id = nuevoLeadGuardado[0].id;
      }
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leadData.id}`, {
        method: 'PATCH',
        headers: headers,
        body: JSON.stringify(leadData)
      });
    }
  } catch (err) {
    console.error("Error guardando lead en Supabase:", err);
  }
}

async function eliminarLeadDeSupabase(id) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, {
      method: 'DELETE',
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
  } catch (err) {
    console.error("Error eliminando lead en Supabase:", err);
  }
}

// ─── LÓGICA DE MODIFICACIÓN DE DATOS (RESTRICCIONES ORIGINALES) ──────────────────
// Modifica los flujos de guardado de datos del app.js original para incluir los "await" hacia la nube

async function saveLead() {
  const nombre = document.getElementById('n-nombre').value.trim();
  if (!nombre) { alert('El nombre es obligatorio.'); return; }

  const fuente = document.getElementById('n-fuente').value;
  const producto = document.getElementById('n-producto').value;
  const presupuesto = document.getElementById('n-presupuesto').value;
  const responsable = document.getElementById('n-responsable').value;
  const ejecutivo = document.getElementById('n-ejecutivo').value;

  const l = {
    nombre,
    empresa: document.getElementById('n-empresa').value.trim(),
    telefono: document.getElementById('n-telefono').value.trim(),
    correo: document.getElementById('n-correo').value.trim(),
    puesto: document.getElementById('n-puesto').value.trim(),
    estado_geo: document.getElementById('n-estado').value || '',
    pais: 'México',
    fuente, producto, presupuesto, responsable, ejecutivo,
    monto: parseFloat(document.getElementById('n-monto').value) || 0,
    estado: document.getElementById('n-situacion').value,
    prioridad: document.getElementById('n-prioridad').value,
    proximoSeg: document.getElementById('n-seg').value,
    notas: document.getElementById('n-notas').value.trim(),
    fechaActualizacion: new Date().toISOString()
  };

  if (editingLeadId !== null) {
    l.id = editingLeadId;
    const idx = LEADS.findIndex(x => x.id === editingLeadId);
    if (idx !== -1) {
      l.fechaCreacion = LEADS[idx].fechaCreacion;
      LEADS[idx] = l;
    }
    await guardarLeadEnSupabase(l, false);
    editingLeadId = null;
    notify('🔄 Lead actualizado correctamente');
  } else {
    l.fechaCreacion = new Date().toISOString();
    // Insertamos temporalmente en el array local; la función actualizará su ID real de base de datos
    LEADS.push(l);
    await guardarLeadEnSupabase(l, true);
    notify('✅ Lead creado exitosamente');
  }

  closePanel(null);
  renderDashboard();
}

async function eliminarLead(id) {
  if (!confirm('¿Estás seguro de eliminar permanentemente este lead?')) return;
  if (!checkPasswordPrompt('Eliminar este Registro de Lead')) return;

  LEADS = LEADS.filter(l => l.id !== id);
  await eliminarLeadDeSupabase(id);
  
  closePanel(null);
  renderDashboard();
  notify('🗑 Lead eliminado de la base de datos');
}

async function addConfigItem(tipo) {
  const input = document.getElementById(`in-${tipo}`);
  const valor = input?.value.trim();
  if (!valor) return;

  if (tipo === 'fuente' && !FUENTES.includes(valor)) FUENTES.push(valor);
  if (tipo === 'producto' && !PRODUCTOS.includes(valor)) PRODUCTOS.push(valor);
  if (tipo === 'presupuesto' && !PRESUPUESTOS.includes(valor)) PRESUPUESTOS.push(valor);
  if (tipo === 'responsable' && !RESPONSABLES.includes(valor)) RESPONSABLES.push(valor);
  if (tipo === 'ejecutivo' && !EJECUTIVOS.includes(valor)) EJECUTIVOS.push(valor);

  input.value = '';
  await guardarConfiguracionEnSupabase();
  renderConfig();
  notify('✨ Opción agregada correctamente');
}

async function removeConfigItem(tipo, valor) {
  if (!checkPasswordPrompt(`Eliminar la opción "${valor}" de la lista`)) return;

  if (tipo === 'fuente') FUENTES = FUENTES.filter(x => x !== valor);
  if (tipo === 'producto') PRODUCTOS = PRODUCTOS.filter(x => x !== valor);
  if (tipo === 'presupuesto') PRESUPUESTOS = PRESUPUESTOS.filter(x => x !== valor);
  if (tipo === 'responsable') RESPONSABLES = RESPONSABLES.filter(x => x !== valor);
  if (tipo === 'ejecutivo') EJECUTIVOS = EJECUTIVOS.filter(x => x !== valor);

  await guardarConfiguracionEnSupabase();
  renderConfig();
  notify('🗑 Opción eliminada');
}

async function saveAdminUser() {
  const userEl = document.getElementById('cfg-admin-user');
  const passEl = document.getElementById('cfg-admin-pass');
  const userVal = userEl?.value.trim();
  const passVal = passEl?.value;

  if (!userVal || !passVal) return;
  if (userVal.toLowerCase() === AUTH_USER.toLowerCase()) {
    alert('❌ No se puede duplicar el usuario raíz.');
    return;
  }

  if (editingAdminIndex !== null) {
    if (!checkPasswordPrompt(`Modificar la configuración del usuario "${ADMINS[editingAdminIndex].user}"`)) return;
    ADMINS[editingAdminIndex] = { user: userVal, pass: passVal };
    editingAdminIndex = null;
    notify('🔄 Cuenta de administrador modificada');
  } else {
    if (ADMINS.some(a => a.user.toLowerCase() === userVal.toLowerCase())) {
      alert('❌ El usuario ya existe.');
      return;
    }
    ADMINS.push({ user: userVal, pass: passVal });
    notify('➕ Administrador añadido');
  }

  userEl.value = ''; passEl.value = '';
  await guardarConfiguracionEnSupabase();
  renderConfig();
}

async function removeAdminUser(index) {
  const adminTarget = ADMINS[index];
  if (!adminTarget) return;

  if (!checkPasswordPrompt(`Eliminar permanentemente los accesos de "${adminTarget.user}"`)) return;

  ADMINS.splice(index, 1);
  if (editingAdminIndex === index) editingAdminIndex = null;

  await guardarConfiguracionEnSupabase();
  renderConfig();
  notify('🗑 Administrador eliminado del sistema');
}

// ─── INICIALIZADOR ASÍNCRONO DEL WINDOW.ONLOAD ORIGINAL ────────────────────────
window.onload = async function() {
  // Primero descargamos todo de Supabase antes de pintar el CRM
  await cargarDatosDesdeSupabase();

  if (sessionStorage.getItem('crm_logged_in') === 'true') {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-layout').style.display = 'block';
    renderDashboard();
    verificarRecordatoriosSeguimiento();
  }
};
