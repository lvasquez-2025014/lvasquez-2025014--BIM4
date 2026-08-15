import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import jwt from 'jsonwebtoken';
import { connectDB } from './db.js';
import { UserService } from './modules/user/services/user.service.js';
import { ExpenseService } from './modules/expense/services/expense.service.js';
import type { Expense } from './modules/expense/models/expense.model.js';

const PUERTO = 3000;
const JWT_SECRET = 'secreto-super-seguro';

const users = new UserService();
const expenses = new ExpenseService();

type AuthRequest = IncomingMessage & { usuario?: string };

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function requireAuth(req: IncomingMessage, res: ServerResponse): boolean {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    sendJson(res, 401, { mensaje: 'No autorizado' });
    return false;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { usuario?: string };
    if (payload.usuario) (req as AuthRequest).usuario = payload.usuario;
    return true;
  } catch {
    sendJson(res, 401, { mensaje: 'Token inválido o expirado' });
    return false;
  }
}

async function seedAdmin(): Promise<void> {
  const exists = await users.findByUsuario('admin');
  if (!exists) {
    await users.create('admin', 'admin123');
    console.log('Usuario admin creado (admin / admin123)');
  }
}

const server = createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const path = url.pathname;
  const id = path.split('/')[3];

  try {
    if (req.method === 'POST' && path === '/api/login') {
      const { usuario, password } = (await readBody(req)) as {
        usuario?: string;
        password?: string;
      };
      if (!usuario || !password) {
        sendJson(res, 400, { mensaje: 'Usuario y contraseña son obligatorios' });
        return;
      }
      const valido = await users.verificarCredenciales(usuario, password);
      if (!valido) {
        sendJson(res, 401, { mensaje: 'Credenciales inválidas' });
        return;
      }
      const token = jwt.sign({ usuario }, JWT_SECRET, { expiresIn: '2h' });
      sendJson(res, 200, { token, usuario });
      return;
    }

    if (req.method === 'POST' && path === '/api/register') {
      const { usuario, password } = (await readBody(req)) as {
        usuario?: string;
        password?: string;
      };
      if (!usuario || !password) {
        sendJson(res, 400, { mensaje: 'Usuario y contraseña son obligatorios' });
        return;
      }
      const existente = await users.findByUsuario(usuario);
      if (existente) {
        sendJson(res, 409, { mensaje: 'El usuario ya existe' });
        return;
      }
      const user = await users.create(usuario, password);
      sendJson(res, 201, { usuario: user.usuario });
      return;
    }

    if (path.startsWith('/api/expenses')) {
      if (!requireAuth(req, res)) return;

      if (req.method === 'GET' && path === '/api/expenses') {
        sendJson(res, 200, await expenses.getAll());
        return;
      }

      if (req.method === 'POST' && path === '/api/expenses') {
        const body = (await readBody(req)) as Partial<Omit<Expense, '_id'>>;
        const nuevo = await expenses.create({
          descripcion: body.descripcion ?? '',
          monto: Number(body.monto) || 0,
          tipo: body.tipo === 'Ingreso' ? 'Ingreso' : 'Gasto',
          categoria: body.categoria ?? '',
          fecha: body.fecha ? new Date(body.fecha) : new Date(),
        });
        sendJson(res, 201, nuevo);
        return;
      }

      if (req.method === 'GET' && id) {
        const gasto = await expenses.getById(id);
        if (!gasto) {
          sendJson(res, 404, { mensaje: 'Gasto no encontrado' });
          return;
        }
        sendJson(res, 200, gasto);
        return;
      }

      if (req.method === 'PUT' && id) {
        const body = (await readBody(req)) as Partial<Omit<Expense, '_id'>>;
        const actualizado = await expenses.update(id, body);
        if (!actualizado) {
          sendJson(res, 404, { mensaje: 'Gasto no encontrado' });
          return;
        }
        sendJson(res, 200, actualizado);
        return;
      }

      if (req.method === 'DELETE' && id) {
        const eliminado = await expenses.delete(id);
        if (!eliminado) {
          sendJson(res, 404, { mensaje: 'Gasto no encontrado' });
          return;
        }
        sendJson(res, 200, { mensaje: 'Gasto eliminado' });
        return;
      }
    }

    sendJson(res, 404, { mensaje: 'Ruta no encontrada' });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { mensaje: 'Error interno del servidor' });
  }
});

async function start(): Promise<void> {
  try {
    await connectDB();
    await seedAdmin();
    server.listen(PUERTO, () => {
      console.log(`Servidor corriendo en http://localhost:${PUERTO}`);
    });
  } catch (err) {
    console.error('No se pudo iniciar el servidor:', err);
    process.exit(1);
  }
}

start();