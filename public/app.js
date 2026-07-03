const tokenKey = 'weddingcraft_token';
const userKey = 'weddingcraft_user';
const mediaSlots = [
  ['coupleHero', 'Couple Hero Image', true],
  ['couplePhoto1', 'Couple Photo 1', false],
  ['couplePhoto2', 'Couple Photo 2', false],
  ['couplePhoto3', 'Couple Photo 3', false],
  ['familyPhoto1', 'Family Photo 1', false],
  ['familyPhoto2', 'Family Photo 2', false],
  ['familyPhoto3', 'Family Photo 3', false],
  ['galleryPhoto1', 'Gallery Photo 1', false],
  ['galleryPhoto2', 'Gallery Photo 2', false],
  ['galleryPhoto3', 'Gallery Photo 3', false],
  ['galleryPhoto4', 'Gallery Photo 4', false],
  ['galleryPhoto5', 'Gallery Photo 5', false],
  ['galleryPhoto6', 'Gallery Photo 6', false]
];

document.addEventListener('DOMContentLoaded', () => {
  revealOnScroll();
  bootAuth();
  bootDashboard();
});

function revealOnScroll() {
  const items = document.querySelectorAll('.section-reveal');
  if (!items.length) {
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: .12 });
  items.forEach((item) => observer.observe(item));
}

function bootAuth() {
  const form = document.querySelector('#authForm');
  if (!form) {
    return;
  }
  let mode = 'login';
  const title = document.querySelector('#authTitle');
  const status = document.querySelector('#authStatus');
  const buttons = document.querySelectorAll('[data-auth-tab]');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      mode = button.dataset.authTab;
      buttons.forEach((item) => item.classList.toggle('active', item === button));
      title.textContent = mode === 'login' ? 'Login' : 'Signup';
      form.password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
      status.textContent = '';
    });
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = 'Processing...';
    const payload = Object.fromEntries(new FormData(form));
    try {
      const data = await request(`/api/auth/${mode}`, { method: 'POST', body: payload, auth: false });
      localStorage.setItem(tokenKey, data.token);
      localStorage.setItem(userKey, JSON.stringify(data.user));
      window.location.href = '/dashboard.html';
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

function bootDashboard() {
  const shell = document.querySelector('.dashboard-shell');
  if (!shell) {
    return;
  }
  const token = localStorage.getItem(tokenKey);
  if (!token) {
    window.location.href = '/auth.html';
    return;
  }
  const state = { media: new Map(), projects: [] };
  bindTabs();
  bindLogout();
  bindEvents();
  bindUploads(state);
  bindProjectForm(state);
  loadProfile();
  loadProjects(state);
}

function bindTabs() {
  const tabs = document.querySelectorAll('[data-panel]');
  const panels = document.querySelectorAll('.dashboard-panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((item) => item.classList.toggle('active', item === tab));
      panels.forEach((panel) => panel.classList.toggle('active', panel.id === `panel-${tab.dataset.panel}`));
    });
  });
}

function bindLogout() {
  const button = document.querySelector('#logoutButton');
  button.addEventListener('click', async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(userKey);
      window.location.href = '/';
      return;
    }
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    window.location.href = '/';
  });
}

function bindEvents() {
  const list = document.querySelector('#eventsList');
  const addButton = document.querySelector('#addEventButton');
  const defaults = [
    ['Mehendi', 'A joyful evening of color, music, and blessings.'],
    ['Haldi', 'A warm celebration with turmeric, laughter, and family rituals.'],
    ['Reception', 'An elegant gathering to celebrate the newly married couple.']
  ];
  defaults.forEach(([name, description]) => addEventCard(name, description));
  addButton.addEventListener('click', () => addEventCard('', ''));

  function addEventCard(name, description) {
    const card = document.createElement('article');
    card.className = 'event-card';
    card.innerHTML = `
      <label>Event Name<input name="eventName" value="${escapeAttribute(name)}" required maxlength="100"></label>
      <label>Event Date<input name="eventDate" type="date" required></label>
      <label>Event Time<input name="eventTime" type="time" required></label>
      <label class="wide">Event Description<textarea name="eventDescription" required maxlength="600">${escapeText(description)}</textarea></label>
      <button class="button ghost" type="button">Remove Event</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      if (list.children.length > 1) {
        card.remove();
      }
    });
    list.appendChild(card);
  }
}

function bindUploads(state) {
  const grid = document.querySelector('#uploadGrid');
  mediaSlots.forEach(([id, label, required]) => {
    const box = document.createElement('label');
    box.className = 'upload-box';
    box.dataset.slot = id;
    box.innerHTML = `
      <span class="upload-title">${label}${required ? ' *' : ''}</span>
      <span>Drop image or tap to upload</span>
      <img alt="${label} preview">
      <div class="progress" aria-hidden="true"><span></span></div>
      <input type="file" accept="image/png,image/jpeg,image/webp" ${required ? 'required' : ''}>
    `;
    const input = box.querySelector('input');
    const progress = box.querySelector('.progress span');
    const preview = box.querySelector('img');
    input.addEventListener('change', () =>handleFile(input.files[0], input, id, label, progress, preview, state));
    box.addEventListener('dragover', (event) => {
      event.preventDefault();
      box.classList.add('dragging');
    });
    box.addEventListener('dragleave', () => box.classList.remove('dragging'));
    box.addEventListener('drop', (event) => {
      event.preventDefault();
      box.classList.remove('dragging');
      const file = event.dataTransfer.files[0];
      handleFile(file, id, label, progress, preview, state);
    });
    grid.appendChild(box);
  });
}

async function handleFile(file, slot, label, progress, preview, state) {
  if (!file) {
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024) {
    progress.style.width = '0';
    alert('Use a JPG, PNG, or WebP image under 6 MB.');
    return;
  }
  preview.src = URL.createObjectURL(file);
  progress.style.width = '8%';
  try {
    const upload = await uploadImage(file, (percent) => {
      progress.style.width = `${percent}%`;
    });
    state.media.set(slot, {
      media_type: slot,
      label,
      cloudinary_public_id: upload.public_id,
      cloudinary_url: upload.secure_url
    });
    const input = document.querySelector(`[data-slot="${slot}"] input`);
    input.required = false;
    progress.style.width = '100%';
  } catch (error) {
    progress.style.width = '0';
    alert(error.message);
  }
}

async function uploadImage(file, onProgress) {
  const signature = await request('/api/media/signature', { method: 'POST' });
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', signature.apiKey);
  body.append('timestamp', signature.timestamp);
  body.append('signature', signature.signature);
  body.append('folder', signature.folder);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 92) + 8);
      }
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error('Image upload failed'));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Image upload failed')));
    xhr.send(body);
  });
}

function bindProjectForm(state) {
  const form = document.querySelector('#projectForm');
  const status = document.querySelector('#projectStatus');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = 'Generating invitation...';
    const submitter = form.querySelector('button[type="submit"]');
    submitter.disabled = true;
    try {
      const payload = buildProjectPayload(form, state);
      const data = await request('/api/projects', { method: 'POST', body: payload });
      status.textContent = 'Invitation generated. ZIP is ready in My Invitations.';
      form.reset();
      state.media.clear();
      document.querySelectorAll('.upload-box img').forEach((img) => img.removeAttribute('src'));
      document.querySelectorAll('.progress span').forEach((bar) => bar.style.width = '0');
      await loadProjects(state);
      document.querySelector('[data-panel="invitations"]').click();
      downloadProject(data.project.id);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submitter.disabled = false;
    }
  });
}

function buildProjectPayload(form, state) {
  const data = new FormData(form);
  const events = [...document.querySelectorAll('.event-card')].map((card) => ({
    event_name: card.querySelector('[name="eventName"]').value,
    event_date: card.querySelector('[name="eventDate"]').value,
    event_time: card.querySelector('[name="eventTime"]').value,
    event_description: card.querySelector('[name="eventDescription"]').value
  }));
  return {
    templateSlug: data.get('templateSlug'),
    couple: {
      brideName: data.get('brideName'),
      groomName: data.get('groomName'),
      tagline: data.get('tagline'),
      message: data.get('message')
    },
    wedding: {
      date: data.get('weddingDate'),
      time: data.get('weddingTime'),
      venueName: data.get('venueName'),
      venueAddress: data.get('venueAddress'),
      mapLink: data.get('mapLink')
    },
    theme: {
      primaryColor: data.get('primaryColor'),
      accentColor: data.get('accentColor'),
      fontFamily: data.get('fontFamily')
    },
    music: data.get('music'),
    events,
    media: [...state.media.values()]
  };
}

async function loadProfile() {
  try {
    const data = await request('/api/auth/me');
    localStorage.setItem(userKey, JSON.stringify(data.user));
    document.querySelector('#userEmail').textContent = data.user.email;
    document.querySelector('#profileEmail').textContent = data.user.email;
  } catch {
    localStorage.removeItem(tokenKey);
    window.location.href = '/auth.html';
  }
}

async function loadProjects(state) {
  const data = await request('/api/projects');
  state.projects = data.projects;
  renderProjects('#projectCards', state.projects, true);
  renderProjects('#downloadCards', state.projects, false);
}

function renderProjects(selector, projects, allowDelete) {
  const target = document.querySelector(selector);
  if (!projects.length) {
    target.innerHTML = '<article class="project-card"><h3>No invitations yet</h3><p class="project-meta">Create your first invitation to see it here.</p></article>';
    return;
  }
  target.innerHTML = projects.map((project) => `
    <article class="project-card">
      <h3>${escapeText(project.projectName)}</h3>
      <div class="project-meta">
        <span>Template Used: ${escapeText(project.templateName)}</span>
        <span>Created Date: ${formatDate(project.createdAt)}</span>
        <span>Expiry Date: ${formatDate(project.expiresAt)}</span>
        <span>Status: ${escapeText(project.status)}</span>
      </div>
      <div class="project-actions">
        <button class="button primary" type="button" data-download="${project.id}">Download ZIP</button>
        ${allowDelete ? `<button class="button ghost" type="button" data-delete="${project.id}">Delete Project</button>` : ''}
      </div>
    </article>
  `).join('');
  target.querySelectorAll('[data-download]').forEach((button) => {
    button.addEventListener('click', () => downloadProject(button.dataset.download));
  });
  target.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      await request(`/api/projects/${button.dataset.delete}`, { method: 'DELETE' });
      window.location.reload();
    });
  });
}

function downloadProject(id) {
  const token = localStorage.getItem(tokenKey);
  const link = document.createElement('a');
  link.href = `/api/projects/${id}/download?token=${encodeURIComponent(token)}`;
  fetch(link.href, { headers: { Authorization: `Bearer ${token}` } })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Download failed');
      }
      return response.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = 'weddingcraft-invitation.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    })
    .catch((error) => alert(error.message));
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem(tokenKey);
  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char]);
}

function escapeAttribute(value) {
  return escapeText(value).replace(/`/g, '&#096;');
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
