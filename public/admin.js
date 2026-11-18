const api = async (url, opts = {}) => {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Request failed');
  return data;
};
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let pets = [];

async function load() {
  try {
    const session = await api('/api/admin/session');
    if (!session.authenticated) { location.href = '/'; return; }
    pets = await api('/api/pets');
    const applications = await api('/api/admin/applications');
    $('#totalPets').textContent = pets.length;
    $('#totalApps').textContent = applications.length;
    $('#pending').textContent = applications.filter(a => a.status === 'Pending').length;
    $('#appsBody').innerHTML = applications.length ? applications.map(a => `<tr><td>${esc(a.name)}</td><td>${esc(pets.find(p => p.id === a.petId)?.name || 'Removed pet')}</td><td>${esc(a.email)}<br>${esc(a.phone)}</td><td>${esc(a.message)}</td><td><select data-app="${esc(a.id)}">${['Pending', 'Approved', 'Rejected'].map(status => `<option ${status === a.status ? 'selected' : ''}>${status}</option>`).join('')}</select></td></tr>`).join('') : '<tr><td colspan="5">No applications yet.</td></tr>';
    $('#petBody').innerHTML = pets.map(p => `<tr><td><span class="adminPet"><span class="adminPetThumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : esc(p.emoji)}</span>${esc(p.name)}</span></td><td>${esc(p.breed)}</td><td>${esc(p.age)}</td><td><button class="delete" data-delete="${p.id}">Remove</button></td></tr>`).join('');
    document.querySelectorAll('[data-app]').forEach(element => {
      element.onchange = async () => {
        try {
          await api('/api/admin/applications/' + element.dataset.app, { method: 'PATCH', body: JSON.stringify({ status: element.value }) });
          load();
        } catch (error) { alert(error.message); }
      };
    });
    document.querySelectorAll('[data-delete]').forEach(element => {
      element.onclick = async () => {
        if (!confirm('Remove this pet?')) return;
        try {
          await api('/api/admin/pets/' + element.dataset.delete, { method: 'DELETE' });
          load();
        } catch (error) { alert(error.message); }
      };
    });
  } catch (error) { alert(error.message); }
}

const imageInput = $('#petImage');
imageInput.onchange = () => {
  const file = imageInput.files[0];
  const preview = $('#imagePreview');
  if (!file) { preview.hidden = true; return; }
  $('#imagePreviewImg').src = URL.createObjectURL(file);
  preview.hidden = false;
};
const readImage = file => new Promise((resolve, reject) => {
  if (!file) return reject(Error('Please choose a pet image.'));
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return reject(Error('Image must be a JPG, PNG or WebP file.'));
  if (file.size > 3 * 1024 * 1024) return reject(Error('Image must be 3 MB or smaller.'));
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(Error('Could not read the selected image.'));
  reader.readAsDataURL(file);
});

$('#addPet').onsubmit = async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const status = $('#statusMsg');
  button.disabled = true;
  status.textContent = 'Adding pet…';
  try {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData);
    payload.image = await readImage(imageInput.files[0]);
    await api('/api/admin/pets', { method: 'POST', body: JSON.stringify(payload) });
    form.reset();
    $('#imagePreview').hidden = true;
    status.textContent = 'Pet added successfully!';
    await load();
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
};
$('#logout').onclick = async () => { await api('/api/admin/logout', { method: 'POST' }); location.href = '/'; };
load();
