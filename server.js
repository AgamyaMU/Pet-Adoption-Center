import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve('public');
const uploadsDir = path.join(root, 'uploads');
const db = path.resolve('data/store.json');
const allowedPetTypes = ['Dog', 'Cat', 'Rabbit'];
const imageTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const initial = {
  pets: [
    { id: 1, name: 'Daisy', type: 'Dog', breed: 'Cavalier Spaniel', age: '2 years', city: 'Los Angeles', emoji: '🐶', color: '#f6d49c', description: 'A gentle, playful companion who loves sunshine.' },
    { id: 2, name: 'Milo', type: 'Cat', breed: 'British Shorthair', age: '1 year', city: 'Austin', emoji: '🐱', color: '#d7dfe6', description: 'A curious little explorer with a calm personality.' },
    { id: 3, name: 'Coco', type: 'Dog', breed: 'Golden Retriever', age: '8 months', city: 'Seattle', emoji: '🐕', color: '#f3dfba', description: 'Friendly, energetic and ready for a loving home.' },
    { id: 4, name: 'Luna', type: 'Rabbit', breed: 'Holland Lop', age: '1 year', city: 'Portland', emoji: '🐰', color: '#e8d7dc', description: 'A sweet bunny who enjoys quiet afternoons.' }
  ],
  applications: [],
  users: []
};

fs.mkdirSync(path.dirname(db), { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(db)) fs.writeFileSync(db, JSON.stringify(initial, null, 2));

const read = () => JSON.parse(fs.readFileSync(db, 'utf8'));
const save = data => fs.writeFileSync(db, JSON.stringify(data, null, 2));
const send = (res, status, obj) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
};
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(value => value.trim().split('=')));
const sessions = new Map();
const adminUser = process.env.ADMIN_USER || 'admin';
const adminPass = process.env.ADMIN_PASSWORD || 'PetHouse@123';
const auth = req => sessions.get(cookies(req).session) === 'admin';
const body = async req => {
  let value = '';
  for await (const chunk of req) {
    value += chunk;
    if (value.length > 5 * 1024 * 1024) throw Error('Payload too large (maximum image size is 3 MB)');
  }
  return JSON.parse(value || '{}');
};
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
const validPhone = value => /^\d{10}$/.test(value || '');

function storeImage(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!match || !imageTypes[match[1]]) throw Error('Please upload a valid JPG, PNG or WebP image.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length) throw Error('The selected image is empty.');
  if (bytes.length > 3 * 1024 * 1024) throw Error('Image must be 3 MB or smaller.');
  const filename = `${crypto.randomUUID()}.${imageTypes[match[1]]}`;
  fs.writeFileSync(path.join(uploadsDir, filename), bytes, { flag: 'wx' });
  return `/uploads/${filename}`;
}

function removeStoredImage(image) {
  if (typeof image !== 'string' || !image.startsWith('/uploads/')) return;
  const filename = path.basename(image);
  const file = path.join(uploadsDir, filename);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    if (pathname.startsWith('/api/')) {
      const data = read();
      if (pathname === '/api/pets' && req.method === 'GET') return send(res, 200, data.pets);

      if (pathname === '/api/applications' && req.method === 'POST') {
        const input = await body(req);
        if (!input.petId || !input.name?.trim() || !validEmail(input.email) || !validPhone(input.phone) || !input.message?.trim()) return send(res, 400, { error: 'Please complete all fields with valid contact information.' });
        if (!data.pets.some(pet => pet.id === Number(input.petId))) return send(res, 404, { error: 'Pet not found' });
        data.applications.push({ id: crypto.randomUUID(), petId: Number(input.petId), name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone, message: input.message.trim(), status: 'Pending', date: new Date().toISOString() });
        save(data);
        return send(res, 201, { message: 'Application submitted successfully!' });
      }

      if (pathname === '/api/register' && req.method === 'POST') {
        const input = await body(req);
        if (!input.name?.trim() || !validEmail(input.email) || !validPhone(input.phone) || !input.password || input.password.length < 8 || !/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(input.password)) return send(res, 400, { error: 'Invalid registration details' });
        const email = input.email.trim().toLowerCase();
        if (data.users.some(user => user.email === email)) return send(res, 409, { error: 'Email already registered' });
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(input.password, salt, 64).toString('hex');
        data.users.push({ id: crypto.randomUUID(), name: input.name.trim(), email, phone: input.phone, salt, hash });
        save(data);
        return send(res, 201, { message: 'Account created successfully!' });
      }

      if (pathname === '/api/login' && req.method === 'POST') {
        const input = await body(req);
        if (input.email === adminUser && input.password === adminPass) {
          const token = crypto.randomBytes(32).toString('hex');
          sessions.set(token, 'admin');
          res.setHeader('Set-Cookie', `session=${token}; HttpOnly; SameSite=Strict; Path=/`);
          return send(res, 200, { role: 'admin' });
        }
        const user = data.users.find(value => value.email === String(input.email || '').trim().toLowerCase());
        if (user) {
          const hash = crypto.scryptSync(input.password || '', user.salt, 64);
          if (crypto.timingSafeEqual(hash, Buffer.from(user.hash, 'hex'))) return send(res, 200, { role: 'user', name: user.name });
        }
        return send(res, 401, { error: 'Invalid credentials' });
      }

      if (pathname === '/api/admin/session' && req.method === 'GET') return send(res, 200, { authenticated: auth(req) });
      if (pathname === '/api/admin/logout' && req.method === 'POST') {
        sessions.delete(cookies(req).session);
        res.setHeader('Set-Cookie', 'session=; HttpOnly; Max-Age=0; SameSite=Strict; Path=/');
        return send(res, 200, { ok: true });
      }

      if (pathname.startsWith('/api/admin/')) {
        if (!auth(req)) return send(res, 401, { error: 'Admin login required' });
        if (pathname === '/api/admin/applications' && req.method === 'GET') return send(res, 200, data.applications);

        if (pathname === '/api/admin/pets' && req.method === 'POST') {
          const input = await body(req);
          if (!input.name?.trim() || !input.breed?.trim() || !allowedPetTypes.includes(input.type)) return send(res, 400, { error: 'Name, breed and a valid pet type are required.' });
          let image;
          try { image = storeImage(input.image); }
          catch (error) { return send(res, 400, { error: error.message }); }
          const pet = {
            id: Math.max(0, ...data.pets.map(value => Number(value.id) || 0)) + 1,
            name: input.name.trim(),
            breed: input.breed.trim(),
            type: input.type,
            age: input.age?.trim() || 'Unknown',
            city: input.city?.trim() || 'Unknown',
            emoji: input.type === 'Cat' ? '🐱' : input.type === 'Rabbit' ? '🐰' : '🐶',
            color: '#e3e7d6',
            description: input.description?.trim() || 'Looking for a forever home.',
            image
          };
          try { data.pets.push(pet); save(data); }
          catch (error) { removeStoredImage(image); throw error; }
          return send(res, 201, pet);
        }

        const applicationMatch = pathname.match(/^\/api\/admin\/applications\/([^/]+)$/);
        if (applicationMatch && req.method === 'PATCH') {
          const input = await body(req);
          const application = data.applications.find(value => value.id === applicationMatch[1]);
          if (!application) return send(res, 404, { error: 'Not found' });
          if (!['Pending', 'Approved', 'Rejected'].includes(input.status)) return send(res, 400, { error: 'Invalid status' });
          application.status = input.status;
          save(data);
          return send(res, 200, application);
        }

        const petMatch = pathname.match(/^\/api\/admin\/pets\/(\d+)$/);
        if (petMatch && req.method === 'DELETE') {
          const pet = data.pets.find(value => value.id === Number(petMatch[1]));
          if (!pet) return send(res, 404, { error: 'Pet not found' });
          data.pets = data.pets.filter(value => value.id !== pet.id);
          save(data);
          removeStoredImage(pet.image);
          return send(res, 200, { ok: true });
        }
      }
      return send(res, 404, { error: 'Not found' });
    }

    const file = path.join(root, decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) && file !== root) return send(res, 403, { error: 'Forbidden' });
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(file).toLowerCase();
    const contentType = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' });
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    send(res, 400, { error: error.message || 'Request failed' });
  }
});

server.listen(process.env.PORT || 3000, () => console.log('Pet House running at http://localhost:' + (process.env.PORT || 3000)));
