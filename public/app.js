const $ = selector => document.querySelector(selector);
const api = async (url, opts = {}) => {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Request failed');
  return data;
};
const defaultPhotos = {
  Daisy: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600&auto=format&fit=crop',
  Milo: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&auto=format&fit=crop',
  Coco: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=600&auto=format&fit=crop',
  Luna: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=600&auto=format&fit=crop'
};
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let pets = [];
let filter = 'All';

const petPhoto = pet => pet.image || defaultPhotos[pet.name];
function render() {
  const visible = pets.filter(pet => filter === 'All' || pet.type === filter);
  $('#pets').innerHTML = visible.map(pet => {
    const photo = petPhoto(pet);
    return `<article class="petcard"><div class="petimage" style="background:${escapeHtml(pet.color)}">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(pet.name)}">` : `<span class="emoji">${escapeHtml(pet.emoji)}</span>`}<span class="tag">♡ Available</span></div><div class="petbody"><h3>${escapeHtml(pet.name)}</h3><p>${escapeHtml(pet.breed)} · ${escapeHtml(pet.age)}</p><p>📍 ${escapeHtml(pet.city)}</p><div class="petbottom"><small>Ready for love ♡</small><button data-pet="${pet.id}">Meet me ↗</button></div></div></article>`;
  }).join('') || '<p>No pets in this category yet.</p>';
  document.querySelectorAll('[data-pet]').forEach(button => button.onclick = () => showPet(Number(button.dataset.pet)));
}

function openModal(html) {
  $('#modalContent').innerHTML = html;
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  $('#modal').hidden = true;
  document.body.style.overflow = '';
}
$('#closeModal').onclick = closeModal;
$('#modal').onclick = event => { if (event.target.id === 'modal') closeModal(); };
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

function field(name, label, type = 'text', placeholder = '') {
  return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" placeholder="${placeholder}"><span class="error" id="err-${name}"></span></div>`;
}
function error(name, message) {
  const element = $('#err-' + name);
  if (element) element.textContent = message;
}
function formError(message) {
  $('#formNotice').innerHTML = `<div class="notice" style="background:#fff0ef;color:#a33">${escapeHtml(message)}</div>`;
}

function registration() {
  openModal(`<span class="eyebrow">WELCOME TO THE FAMILY</span><h2>Create your account ♡</h2><p>Join our little community of animal lovers.</p><form id="registerForm" novalidate>${field('name', 'Full name', 'text', 'Your name')}${field('email', 'Email address', 'email', 'you@example.com')}${field('phone', 'Phone number', 'tel', '10-digit number')}${field('password', 'Password', 'password', 'At least 8 characters')}<div id="formNotice"></div><button class="btn" style="width:100%">Create account ↗</button></form><p>Already have an account? <button class="switch" id="switchLogin">Log in</button></p>`);
  $('#switchLogin').onclick = login;
  $('#registerForm').onsubmit = async event => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.target));
    let valid = true;
    ['name', 'email', 'phone', 'password'].forEach(key => error(key, ''));
    $('#formNotice').innerHTML = '';
    for (const key of ['name', 'email', 'phone', 'password']) {
      if (!input[key].trim()) { error(key, 'This field is required.'); valid = false; }
    }
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) { error('email', 'Enter a valid email address.'); valid = false; }
    if (input.phone && !/^\d{10}$/.test(input.phone)) { error('phone', 'Phone number must contain exactly 10 digits.'); valid = false; }
    if (input.password && input.password.length < 8) { error('password', 'Password must contain at least 8 characters.'); valid = false; }
    if (input.password && input.password.length >= 8 && !/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(input.password)) { error('password', 'Use uppercase, lowercase, number and special character.'); valid = false; }
    if (!valid) return;
    try {
      const data = await api('/api/register', { method: 'POST', body: JSON.stringify(input) });
      $('#formNotice').innerHTML = `<div class="notice">${escapeHtml(data.message)} You can now log in.</div>`;
      event.target.reset();
    } catch (requestError) { formError(requestError.message); }
  };
}

function login() {
  openModal(`<span class="eyebrow">WELCOME BACK</span><h2>Good to see you again!</h2><p>Sign in to your Pet House account.</p><form id="loginForm">${field('email', 'Email / Admin username', 'text', 'you@example.com')}${field('password', 'Password', 'password', 'Your password')}<div id="formNotice"></div><button class="btn" style="width:100%">Log in ↗</button></form><p>New here? <button class="switch" id="switchRegister">Create an account</button></p>`);
  $('#switchRegister').onclick = registration;
  $('#loginForm').onsubmit = async event => {
    event.preventDefault();
    try {
      const input = Object.fromEntries(new FormData(event.target));
      const data = await api('/api/login', { method: 'POST', body: JSON.stringify(input) });
      if (data.role === 'admin') location.href = '/admin.html';
      else {
        openModal(`<h2>Welcome, ${escapeHtml(data.name)}! 💚</h2><p>You're signed in. Find your perfect pet and submit an adoption request.</p><button class="btn" id="done">Explore pets ↗</button>`);
        $('#done').onclick = () => { closeModal(); location.hash = '#explore'; };
      }
    } catch (requestError) { formError(requestError.message); }
  };
}

function showPet(id) {
  const pet = pets.find(value => value.id === id);
  if (!pet) return;
  const photo = petPhoto(pet);
  openModal(`${photo ? `<img class="modalPetImage" src="${escapeHtml(photo)}" alt="${escapeHtml(pet.name)}">` : ''}<span class="eyebrow">YOUR POTENTIAL BEST FRIEND</span><h2>Meet ${escapeHtml(pet.name)} ${escapeHtml(pet.emoji)}</h2><p>${escapeHtml(pet.breed)} · ${escapeHtml(pet.age)} · ${escapeHtml(pet.city)}</p><p>${escapeHtml(pet.description)}</p><form id="adoptForm" novalidate>${field('name', 'Your full name')}${field('email', 'Email address', 'email')}${field('phone', 'Phone number', 'tel')}<div class="field"><label for="message">Why would you love to adopt ${escapeHtml(pet.name)}?</label><textarea id="message" name="message" rows="3"></textarea><span class="error" id="err-message"></span></div><div id="formNotice"></div><button class="btn" style="width:100%">Send adoption request ♡</button></form>`);
  $('#adoptForm').onsubmit = async event => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.target));
    let valid = true;
    ['name', 'email', 'phone', 'message'].forEach(key => {
      error(key, '');
      if (!input[key].trim()) { error(key, 'This field is required.'); valid = false; }
    });
    if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) { error('email', 'Enter a valid email.'); valid = false; }
    if (input.phone && !/^\d{10}$/.test(input.phone)) { error('phone', 'Enter exactly 10 digits.'); valid = false; }
    if (!valid) return;
    try {
      await api('/api/applications', { method: 'POST', body: JSON.stringify({ ...input, petId: id }) });
      openModal(`<h2>Request received! 🐾</h2><p>Thank you for giving ${escapeHtml(pet.name)} a chance. Our adoption team will review your application.</p><button class="btn" id="done">Wonderful ♡</button>`);
      $('#done').onclick = closeModal;
    } catch (requestError) { formError(requestError.message); }
  };
}

$('#loginBtn').onclick = login;
$('#joinBtn').onclick = registration;
$('#menuBtn').onclick = () => $('.nav nav').classList.toggle('open');
document.querySelectorAll('.filter').forEach(button => button.onclick = () => {
  document.querySelectorAll('.filter').forEach(value => value.classList.remove('active'));
  button.classList.add('active');
  filter = button.dataset.type;
  render();
});
api('/api/pets').then(data => { pets = data; render(); }).catch(() => { $('#pets').innerHTML = '<p>Unable to load pets. Please refresh.</p>'; });
