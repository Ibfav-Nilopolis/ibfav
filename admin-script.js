console.log('🔧 Iniciando painel administrativo...');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC0CY0Ds3tARkQFSOAOY8aVMnoFvDbu9Rs",
  authDomain: "ibfav-c9d00.firebaseapp.com",
  projectId: "ibfav-c9d00",
  storageBucket: "ibfav-c9d00.firebasestorage.app",
  messagingSenderId: "666092929823",
  appId: "1:666092929823:web:c17194e606d41da397662a"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let storage;
try {
  storage = firebase.storage();
  console.log('✅ Firebase Storage inicializado');
} catch (error) {
  console.error('❌ Erro ao inicializar Storage:', error);
  storage = null;
}

console.log('✅ Firebase inicializado');

// Variáveis globais
let currentEditPhotoId = null;

// ===================== LOGIN =====================
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");

loginBtn.addEventListener("click", handleLogin);

document.getElementById("loginPassword").addEventListener('keypress', function (e) {
  if (e.key === 'Enter') handleLogin();
});

async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    loginMessage.innerHTML = "<p class='error-message'>Preencha todos os campos.</p>";
    return;
  }

  try {
    loginMessage.innerHTML = "<p>Verificando credenciais...</p>";
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const doc = await db.collection("users").doc(user.uid).get();

    if (!doc.exists || doc.data().role !== "admin") {
      loginMessage.innerHTML = "<p class='error-message'>Acesso negado. Somente administradores.</p>";
      await auth.signOut();
      return;
    }

    loginMessage.innerHTML = "";
    document.getElementById("login-section").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";

    // Carregar dados
    loadDashboard();
    loadUsers();
    loadPhotos();
    loadEvents();

  } catch (error) {
    console.error('Erro no login:', error);
    loginMessage.innerHTML = `<p class='error-message'>Erro: ${error.message}</p>`;
  }
}

// ===================== LOGOUT =====================
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
  document.getElementById("admin-panel").style.display = "none";
  document.getElementById("login-section").style.display = "block";
  document.getElementById("loginPassword").value = '';
  document.getElementById("loginEmail").value = '';
});

function voltarPagina() {
  window.location.href = '/index.html';
}

// ===================== TROCA DE ABAS =====================
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    
    // Atualizar dashboard ao abrir a aba
    if (btn.dataset.tab === 'info') {
      loadDashboard();
    }
  });
});

// ===================== DASHBOARD =====================
async function loadDashboard() {
  console.log('📊 Carregando dashboard...');
  
  try {
    // Carregar estatísticas básicas
    const [eventsSnap, photosSnap, usersSnap] = await Promise.all([
      db.collection('events').get(),
      db.collection('photos').get(),
      db.collection('users').get()
    ]);

    // Totais básicos
    document.getElementById('totalEvents').textContent = eventsSnap.size;
    document.getElementById('totalPhotos').textContent = photosSnap.size;
    document.getElementById('totalUsers').textContent = usersSnap.size;

    // Eventos próximos
    const today = new Date().toISOString().split('T')[0];
    const upcomingEventsSnap = await db.collection('events')
      .where('date', '>=', today)
      .get();
    document.getElementById('upcomingEvents').textContent = upcomingEventsSnap.size;

    // Fotos este mês
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const photosThisMonth = photosSnap.docs.filter(doc => {
      const data = doc.data();
      if (data.timestamp) {
        const photoDate = data.timestamp.toDate();
        return photoDate >= firstDayOfMonth;
      }
      return false;
    });

    document.getElementById('recentPhotos').textContent = photosThisMonth.length;

    // Uso de armazenamento (simulado - Firebase Storage requer regras específicas)
    const storagePercent = Math.min((photosSnap.size / 100) * 100, 100);
    document.getElementById('storageUsed').textContent = storagePercent.toFixed(0) + '%';

    // ===== ANÁLISES DETALHADAS =====
    
    // Eventos futuros e passados
    const futureEvents = upcomingEventsSnap.size;
    const pastEvents = eventsSnap.size - futureEvents;
    document.getElementById('futureEvents').textContent = futureEvents;
    document.getElementById('pastEvents').textContent = pastEvents;

    // Próximo evento
    if (upcomingEventsSnap.size > 0) {
      const nextEventData = upcomingEventsSnap.docs[0].data();
      const nextEventDate = new Date(nextEventData.date + 'T' + nextEventData.time);
      document.getElementById('nextEvent').textContent = nextEventDate.toLocaleDateString('pt-BR');
    } else {
      document.getElementById('nextEvent').textContent = 'Nenhum';
    }

    // Fotos mês passado
    const firstDayLastMonth = new Date();
    firstDayLastMonth.setMonth(firstDayLastMonth.getMonth() - 1);
    firstDayLastMonth.setDate(1);
    firstDayLastMonth.setHours(0, 0, 0, 0);

    const photosLastMonth = photosSnap.docs.filter(doc => {
      const data = doc.data();
      if (data.timestamp) {
        const photoDate = data.timestamp.toDate();
        return photoDate >= firstDayLastMonth && photoDate < firstDayOfMonth;
      }
      return false;
    });

    document.getElementById('photosThisMonth').textContent = photosThisMonth.length;
    document.getElementById('photosLastMonth').textContent = photosLastMonth.length;

    // Última foto
    if (photosSnap.size > 0) {
      const sortedPhotos = photosSnap.docs.sort((a, b) => {
        const aTime = a.data().timestamp?.toDate() || new Date(0);
        const bTime = b.data().timestamp?.toDate() || new Date(0);
        return bTime - aTime;
      });
      const lastPhotoDate = sortedPhotos[0].data().timestamp?.toDate();
      if (lastPhotoDate) {
        document.getElementById('lastPhoto').textContent = lastPhotoDate.toLocaleDateString('pt-BR');
      }
    }

    // Usuários por tipo
    let adminCount = 0, editorCount = 0, normalCount = 0;
    usersSnap.forEach(doc => {
      const role = doc.data().role;
      if (role === 'admin') adminCount++;
      else if (role === 'editor') editorCount++;
      else normalCount++;
    });

    document.getElementById('adminUsers').textContent = adminCount;
    document.getElementById('editorUsers').textContent = editorCount;
    document.getElementById('normalUsers').textContent = normalCount;

    // ===== ATIVIDADES RECENTES =====
    loadRecentActivity(photosSnap, eventsSnap, usersSnap);

    // ===== GRÁFICOS DE PROGRESSO =====
    const photoGoal = 20;
    const eventGoal = 10;

    const photoProgress = Math.min((photosThisMonth.length / photoGoal) * 100, 100);
    const eventProgress = Math.min((futureEvents / eventGoal) * 100, 100);

    document.getElementById('photoProgress').style.width = photoProgress + '%';
    document.getElementById('photoProgressText').textContent = `${photosThisMonth.length} de ${photoGoal} fotos`;

    document.getElementById('eventProgress').style.width = eventProgress + '%';
    document.getElementById('eventProgressText').textContent = `${futureEvents} de ${eventGoal} eventos`;

    console.log('✅ Dashboard carregado');

  } catch (error) {
    console.error('❌ Erro ao carregar dashboard:', error);
  }
}

function loadRecentActivity(photosSnap, eventsSnap, usersSnap) {
  const activityList = document.getElementById('recentActivity');
  activityList.innerHTML = '';

  const activities = [];

  // Fotos recentes
  photosSnap.docs.slice(0, 3).forEach(doc => {
    const data = doc.data();
    activities.push({
      type: 'photo',
      icon: 'fas fa-image',
      title: 'Nova foto adicionada',
      time: data.timestamp?.toDate() || new Date(),
      description: data.description || 'Sem descrição'
    });
  });

  // Eventos recentes
  eventsSnap.docs.slice(0, 3).forEach(doc => {
    const data = doc.data();
    activities.push({
      type: 'event',
      icon: 'fas fa-calendar',
      title: `Evento: ${data.title}`,
      time: new Date(data.date + 'T' + data.time),
      description: data.location || 'Local não informado'
    });
  });

  // Usuários recentes
  usersSnap.docs.slice(0, 2).forEach(doc => {
    const data = doc.data();
    activities.push({
      type: 'user',
      icon: 'fas fa-user-plus',
      title: `Novo usuário: ${data.email}`,
      time: data.createdAt?.toDate() || new Date(),
      description: `Função: ${data.role}`
    });
  });

  // Ordenar por data
  activities.sort((a, b) => b.time - a.time);

  // Exibir apenas os 10 mais recentes
  activities.slice(0, 10).forEach(activity => {
    const li = document.createElement('li');
    li.className = 'activity-item';
    
    const timeAgo = getTimeAgo(activity.time);
    
    li.innerHTML = `
      <div class="activity-icon ${activity.type}">
        <i class="${activity.icon}"></i>
      </div>
      <div class="activity-content">
        <div class="activity-title">${activity.title}</div>
        <div class="activity-time">${timeAgo}</div>
      </div>
    `;
    activityList.appendChild(li);
  });

  if (activities.length === 0) {
    activityList.innerHTML = '<li class="activity-item">Nenhuma atividade recente</li>';
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  const intervals = {
    ano: 31536000,
    mês: 2592000,
    dia: 86400,
    hora: 3600,
    minuto: 60,
    segundo: 1
  };

  for (const [name, secondsInInterval] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInInterval);
    if (interval >= 1) {
      return interval === 1 ? `Há 1 ${name}` : `Há ${interval} ${name}s`;
    }
  }
  
  return 'Agora mesmo';
}

// ===================== CRIAR USUÁRIO =====================
document.getElementById("createUserBtn").addEventListener("click", async () => {
  const name = document.getElementById("newUserName").value.trim();
  const email = document.getElementById("newUserEmail").value.trim();
  const password = document.getElementById("newUserPassword").value.trim();
  const role = document.getElementById("newUserRole").value;
  const userMessage = document.getElementById("userMessage");

  if (!name || !email || !password) {
    userMessage.innerHTML = "<p class='error-message'>Preencha todos os campos.</p>";
    return;
  }

  if (password.length < 6) {
    userMessage.innerHTML = "<p class='error-message'>A senha deve ter no mínimo 6 caracteres.</p>";
    return;
  }

  try {
    userMessage.innerHTML = "<p>Criando usuário...</p>";

    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    await db.collection("users").doc(data.localId).set({
      name: name,
      email: email,
      role: role,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    userMessage.innerHTML = "<p class='success-message'>Usuário criado com sucesso!</p>";
    document.getElementById("newUserName").value = '';
    document.getElementById("newUserEmail").value = '';
    document.getElementById("newUserPassword").value = '';
    loadUsers();
    loadDashboard();

  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    userMessage.innerHTML = `<p class='error-message'>Erro: ${error.message}</p>`;
  }
});

// ===================== LISTAR USUÁRIOS =====================
async function loadUsers() {
  const list = document.getElementById("usersList");
  list.innerHTML = "<p>Carregando...</p>";

  try {
    const snapshot = await db.collection("users").get();
    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML = "<p>Nenhum usuário encontrado.</p>";
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'item-card';
      
      // Badge de role
      let roleBadge = '';
      let roleColor = '';
      switch(data.role) {
        case 'admin':
          roleColor = '#ff6b6b';
          roleBadge = '<i class="fas fa-crown"></i> Administrador';
          break;
        case 'editor':
          roleColor = '#4facfe';
          roleBadge = '<i class="fas fa-pen"></i> Editor';
          break;
        default:
          roleColor = '#00b894';
          roleBadge = '<i class="fas fa-user"></i> Usuário';
      }
      
      card.innerHTML = `
        <div style="border-left: 4px solid ${roleColor}; padding-left: 15px; margin-bottom: 15px;">
          <h4><i class="fas fa-user-circle"></i> ${data.name || 'Nome não informado'}</h4>
          <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${data.email}</p>
          <p style="color: ${roleColor};"><strong>${roleBadge}</strong></p>
          <p><i class="fas fa-calendar-plus"></i> <strong>Criado em:</strong> ${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('pt-BR') : 'N/A'}</p>
        </div>
        <div class="item-actions">
          <button class="btn btn-success" onclick="editUser('${doc.id}')">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-danger" onclick="deleteUser('${doc.id}', '${data.email}')">
            <i class="fas fa-trash"></i> Excluir
          </button>
        </div>
      `;
      list.appendChild(card);
    });
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
    list.innerHTML = "<p class='error-message'>Erro ao carregar usuários.</p>";
  }
}

// ===================== EDITAR USUÁRIO =====================
window.editUser = async function(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    
    if (!doc.exists) {
      showMessage('Usuário não encontrado.', 'error');
      return;
    }

    const data = doc.data();
    
    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-user-name').value = data.name || '';
    document.getElementById('edit-user-email').value = data.email;
    document.getElementById('edit-user-role').value = data.role;
    
    document.getElementById('editUserModal').style.display = 'block';

  } catch (error) {
    console.error('Erro ao carregar usuário:', error);
    showMessage('Erro ao carregar dados do usuário.', 'error');
  }
}

window.closeEditUserModal = function() {
  document.getElementById('editUserModal').style.display = 'none';
}

window.saveUserEdit = async function() {
  const userId = document.getElementById('edit-user-id').value;
  const name = document.getElementById('edit-user-name').value.trim();
  const role = document.getElementById('edit-user-role').value;

  if (!name) {
    showMessage('O nome é obrigatório.', 'error');
    return;
  }

  try {
    await db.collection('users').doc(userId).update({
      name: name,
      role: role,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showMessage('Usuário atualizado com sucesso!', 'success');
    closeEditUserModal();
    loadUsers();
    loadDashboard();

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    showMessage('Erro ao atualizar usuário.', 'error');
  }
}

// ===================== DELETAR USUÁRIO =====================
window.deleteUser = async function(userId, userEmail) {
  if (!confirm(`Tem certeza que deseja excluir o usuário "${userEmail}"?\n\nEsta ação não pode ser desfeita.`)) {
    return;
  }

  try {
    await db.collection('users').doc(userId).delete();
    showMessage('Usuário excluído com sucesso!', 'success');
    loadUsers();
    loadDashboard();

  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    showMessage('Erro ao excluir usuário.', 'error');
  }
}

// ===================== UPLOAD DE FOTOS =====================
async function uploadToImgur(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: {
      'Authorization': 'Client-ID 546c25a59c58ad7'
    },
    body: formData
  });

  const data = await response.json();
  
  if (data.success) {
    return data.data.link;
  } else {
    throw new Error(data.data?.error || 'Erro ao fazer upload no Imgur');
  }
}

async function uploadToFirebase(file, fileName) {
  const storageRef = storage.ref(fileName);
  const uploadTask = storageRef.put(file);

  await new Promise((resolve, reject) => {
    uploadTask.on('state_changed', 
      null, 
      (error) => reject(error),
      () => resolve()
    );
  });

  const downloadURL = await storageRef.getDownloadURL();
  return downloadURL;
}

document.getElementById('photo-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const files = document.getElementById('photo-files').files;
  const description = document.getElementById('photo-description').value;
  const storageService = document.getElementById('photo-storage-service').value;

  if (files.length === 0) {
    showMessage('Selecione pelo menos uma foto!', 'error');
    return;
  }

  if (storageService === 'firebase' && !storage) {
    showMessage('Firebase Storage não está configurado.', 'error');
    return;
  }

  const loading = document.getElementById('photo-loading');
  loading.style.display = 'block';

  try {
    let uploadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith('image/')) {
        console.warn(`Arquivo ${file.name} não é uma imagem válida`);
        continue;
      }

      console.log(`📤 Enviando foto ${i + 1}/${files.length}: ${file.name}`);

      let downloadURL;
      let fileName;

      switch(storageService) {
        case 'imgur':
          downloadURL = await uploadToImgur(file);
          fileName = `imgur_${Date.now()}_${i}`;
          break;
        
        case 'firebase':
          fileName = `photos/${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          downloadURL = await uploadToFirebase(file, fileName);
          break;
        
        default:
          throw new Error('Serviço não reconhecido');
      }

      await db.collection('photos').add({
        url: downloadURL,
        description: description || 'Sem descrição',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        fileName: fileName,
        storageService: storageService
      });

      uploadedCount++;
    }

    if (uploadedCount > 0) {
      showMessage(`${uploadedCount} foto(s) enviada(s) com sucesso!`, 'success');
      document.getElementById('photo-form').reset();
      loadPhotos();
      loadDashboard();
    }

  } catch (error) {
    console.error('❌ Erro ao enviar fotos:', error);
    showMessage(`Erro: ${error.message}`, 'error');
  } finally {
    loading.style.display = 'none';
  }
});

// ===================== CARREGAR FOTOS =====================
async function loadPhotos() {
  const grid = document.getElementById('photos-grid');
  grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

  try {
    const snapshot = await db.collection('photos').orderBy('timestamp', 'desc').get();
    grid.innerHTML = '';

    if (snapshot.empty) {
      grid.innerHTML = '<p style="text-align: center;">Nenhuma foto encontrada.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <img src="${data.url}" alt="Foto" class="item-image">
        <p><strong>Descrição:</strong> ${data.description || 'Sem descrição'}</p>
        <p><strong>Data:</strong> ${data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString('pt-BR') : 'N/A'}</p>
        <div class="item-actions">
          <button class="btn btn-success" onclick="editPhoto('${doc.id}', '${encodeURIComponent(data.description)}', '${data.url}')">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-danger" onclick="deletePhoto('${doc.id}', '${data.fileName || ''}', '${data.storageService || ''}')">
            <i class="fas fa-trash"></i> Excluir
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

  } catch (error) {
    console.error('Erro ao carregar fotos:', error);
    grid.innerHTML = '<p>Erro ao carregar fotos.</p>';
  }
}

window.editPhoto = function(docId, description, url) {
  currentEditPhotoId = docId;
  document.getElementById('edit-photo-description').value = decodeURIComponent(description);
  document.getElementById('edit-photo-preview').src = url;
  document.getElementById('editPhotoModal').style.display = 'block';
}

window.closeEditPhotoModal = function() {
  document.getElementById('editPhotoModal').style.display = 'none';
  currentEditPhotoId = null;
}

window.savePhotoEdit = async function() {
  if (!currentEditPhotoId) return;

  const newDescription = document.getElementById('edit-photo-description').value;

  try {
    await db.collection('photos').doc(currentEditPhotoId).update({
      description: newDescription
    });

    showMessage('Foto atualizada!', 'success');
    closeEditPhotoModal();
    loadPhotos();

  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao atualizar.', 'error');
  }
}

window.deletePhoto = async function(docId, fileName, storageService) {
  if (!confirm('Excluir esta foto?')) return;

  try {
    if (storageService === 'firebase' && fileName && storage) {
      try {
        await storage.ref(fileName).delete();
      } catch (e) {
        console.warn('Erro ao deletar do Storage:', e);
      }
    }

    await db.collection('photos').doc(docId).delete();
    showMessage('Foto excluída!', 'success');
    loadPhotos();
    loadDashboard();

  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao excluir.', 'error');
  }
}

// ===================== EVENTOS =====================
document.getElementById('event-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const eventId = document.getElementById('event-id').value;
  const title = document.getElementById('event-title').value;
  const date = document.getElementById('event-date').value;
  const time = document.getElementById('event-time').value;
  const description = document.getElementById('event-description').value;
  const location = document.getElementById('event-location').value;

  const loading = document.getElementById('event-loading');
  loading.classList.add('show');

  try {
    const eventData = {
      title, date, time, description, location
    };

    if (eventId) {
      await db.collection('events').doc(eventId).update(eventData);
      showMessage('Evento atualizado!', 'success');
    } else {
      eventData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('events').add(eventData);
      showMessage('Evento adicionado!', 'success');
    }

    resetEventForm();
    loadEvents();
    loadDashboard();

  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao salvar evento.', 'error');
  } finally {
    loading.classList.remove('show');
  }
});

document.getElementById('event-cancel-btn').addEventListener('click', resetEventForm);

function resetEventForm() {
  document.getElementById('event-form').reset();
  document.getElementById('event-id').value = '';
  document.getElementById('event-submit-btn').innerHTML = '<i class="fas fa-calendar-plus"></i> Adicionar Evento';
  document.getElementById('event-cancel-btn').style.display = 'none';
}

async function loadEvents() {
  const grid = document.getElementById('events-grid');
  grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

  try {
    const snapshot = await db.collection('events').orderBy('date', 'asc').get();
    grid.innerHTML = '';

    if (snapshot.empty) {
      grid.innerHTML = '<p>Nenhum evento encontrado.</p>';
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const eventDate = new Date(data.date + 'T' + data.time);
      const isUpcoming = eventDate > new Date();

      const card = document.createElement('div');
      card.className = 'item-card';
      card.innerHTML = `
        <div style="border-left: 4px solid ${isUpcoming ? '#00b894' : '#ddd'}; padding-left: 15px;">
          <h4>${data.title}</h4>
          <p><i class="fas fa-calendar"></i> ${new Date(data.date).toLocaleDateString('pt-BR')}</p>
          <p><i class="fas fa-clock"></i> ${data.time}</p>
          ${data.location ? `<p><i class="fas fa-map-marker-alt"></i> ${data.location}</p>` : ''}
          <small>${isUpcoming ? '🟢 Próximo' : '🔴 Passado'}</small>
        </div>
        <div class="item-actions">
          <button class="btn btn-success" onclick="editEvent('${doc.id}')">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-danger" onclick="deleteEvent('${doc.id}')">
            <i class="fas fa-trash"></i> Excluir
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

  } catch (error) {
    console.error('Erro:', error);
    grid.innerHTML = '<p>Erro ao carregar eventos.</p>';
  }
}

window.editEvent = async function(docId) {
  try {
    const doc = await db.collection('events').doc(docId).get();
    
    if (!doc.exists) return;

    const data = doc.data();
    
    document.getElementById('event-id').value = docId;
    document.getElementById('event-title').value = data.title;
    document.getElementById('event-date').value = data.date;
    document.getElementById('event-time').value = data.time;
    document.getElementById('event-description').value = data.description || '';
    document.getElementById('event-location').value = data.location || '';

    document.getElementById('event-submit-btn').innerHTML = '<i class="fas fa-save"></i> Atualizar';
    document.getElementById('event-cancel-btn').style.display = 'inline-block';

    document.getElementById('event-form').scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    console.error('Erro:', error);
  }
}

window.deleteEvent = async function (docId) {
  if (!confirm('Excluir este evento?')) return;

  try {
    await db.collection('events').doc(docId).delete();
    showMessage('Evento excluído!', 'success');
    loadEvents();
    loadDashboard();

  } catch (error) {
    console.error('Erro:', error);
    showMessage('Erro ao excluir.', 'error');
  }
}

// ===================== UTILIDADES =====================
function showMessage(message, type) {
  document.querySelectorAll('.success-message, .error-message').forEach(el => el.remove());

  const messageDiv = document.createElement('div');
  messageDiv.className = type + '-message';
  messageDiv.textContent = message;

  const activeTab = document.querySelector('.tab-content.active');
  activeTab.insertBefore(messageDiv, activeTab.firstChild);

  setTimeout(() => {
    messageDiv.remove();
  }, 5000);
}

document.getElementById('photo-files').addEventListener('change', function (e) {
  const files = e.target.files;
  const label = document.querySelector('.file-upload-label');

  if (files.length > 0) {
    label.innerHTML = `<i class="fas fa-check-circle" style="color: #00b894; font-size: 2rem; margin-right: 10px;"></i>${files.length} foto(s) selecionada(s)`;
  } else {
    label.innerHTML = '<i class="fas fa-cloud-upload-alt" style="font-size: 2rem; margin-right: 10px;"></i>Clique para selecionar fotos';
  }
});

console.log('✅ Admin carregado');