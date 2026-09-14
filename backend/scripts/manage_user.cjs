/**
 * VOUGHT SECURITY // SCRIPT DE GESTIÓN DIRECTA DE USUARIOS EN MONGODB
 * 
 * Permite crear, promover, modificar contraseñas y listar usuarios directamente
 * en MongoDB sin requerir que el backend esté corriendo ni tokens de administrador previos.
 */

const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

// Búsqueda robusta del módulo mongodb
function getMongoClient() {
  const candidatePaths = [
    path.resolve(__dirname, '../node_modules/mongodb'),
    path.resolve(__dirname, '../../backend/node_modules/mongodb'),
    path.resolve(__dirname, '../backend/node_modules/mongodb'),
    path.resolve(__dirname, 'node_modules/mongodb'),
    'c:/Users/asm/Desktop/lvasquez-2025014--BIM4/backend/node_modules/mongodb',
    'mongodb'
  ];

  for (const p of candidatePaths) {
    try {
      const mod = require(p);
      if (mod && mod.MongoClient) {
        return mod.MongoClient;
      }
    } catch {
      // Intentar con el siguiente
    }
  }
  throw new Error('No se pudo encontrar el módulo mongodb en las rutas del proyecto.');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

async function getDbCollection() {
  const MongoClient = getMongoClient();
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'gastos-proyect';
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection('users');
  return { client, collection };
}

async function main() {
  const [,, command, ...args] = process.argv;

  if (!command) {
    console.log(JSON.stringify({
      error: 'Comando no especificado. Uso: node manage_user.cjs [create|promote|change-password|list] [args...]'
    }));
    process.exit(1);
  }

  let client;
  try {
    const dbInfo = await getDbCollection();
    client = dbInfo.client;
    const col = dbInfo.collection;

    switch (command) {
      case 'create': {
        const [usuario, password, nombre, rol = 'user', foto = '/assets/images/perfil.png'] = args;
        if (!usuario || !password) {
          console.error(JSON.stringify({ error: 'Faltan parámetros: usuario y contraseña son obligatorios' }));
          process.exit(1);
        }
        const { hash, salt } = hashPassword(password);
        const assignedRole = (rol === 'admin') ? 'admin' : 'user';

        const updateData = {
          usuario,
          nombre: nombre || usuario,
          passwordHash: hash,
          salt,
          rol: assignedRole,
          foto: foto || '/assets/images/perfil.png',
          updatedAt: new Date()
        };

        const result = await col.updateOne(
          { usuario },
          { 
            $set: updateData,
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true }
        );

        const savedUser = await col.findOne({ usuario });

        console.log(JSON.stringify({
          success: true,
          action: 'create',
          id: savedUser._id ? savedUser._id.toString() : '',
          usuario: savedUser.usuario,
          nombre: savedUser.nombre,
          rol: savedUser.rol,
          foto: savedUser.foto,
          isNew: Boolean(result.upsertedCount)
        }));
        break;
      }

      case 'set-photo': {
        const [usuario, foto] = args;
        if (!usuario || !foto) {
          console.error(JSON.stringify({ error: 'Faltan parámetros: usuario y foto son obligatorios' }));
          process.exit(1);
        }

        const res = await col.updateOne(
          { usuario },
          { $set: { foto, updatedAt: new Date() } }
        );

        console.log(JSON.stringify({
          success: true,
          action: 'set-photo',
          usuario,
          foto
        }));
        break;
      }

      case 'promote': {
        const [usuario] = args;
        if (!usuario) {
          console.error(JSON.stringify({ error: 'Falta parámetro: usuario es obligatorio' }));
          process.exit(1);
        }

        const existing = await col.findOne({ usuario });
        if (existing) {
          await col.updateOne({ usuario }, { $set: { rol: 'admin', updatedAt: new Date() } });
        } else {
          // Si no existe, crear registro placeholder con rol admin para cuando inicie sesión
          await col.updateOne(
            { usuario },
            { 
              $set: { usuario, rol: 'admin', nombre: usuario, updatedAt: new Date() },
              $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
          );
        }

        const updated = await col.findOne({ usuario });
        console.log(JSON.stringify({
          success: true,
          action: 'promote',
          usuario: updated.usuario,
          nombre: updated.nombre,
          rol: updated.rol
        }));
        break;
      }

      case 'change-password': {
        const [usuario, newPassword] = args;
        if (!usuario || !newPassword) {
          console.error(JSON.stringify({ error: 'Faltan parámetros: usuario y nueva contraseña son obligatorios' }));
          process.exit(1);
        }

        const { hash, salt } = hashPassword(newPassword);
        const res = await col.updateOne(
          { usuario },
          { $set: { passwordHash: hash, salt, updatedAt: new Date() } }
        );

        if (res.matchedCount === 0) {
          console.error(JSON.stringify({ error: `Usuario "${usuario}" no encontrado en la base de datos` }));
          process.exit(1);
        }

        console.log(JSON.stringify({
          success: true,
          action: 'change-password',
          usuario
        }));
        break;
      }

      case 'list': {
        const users = await col.find().toArray();
        const simplified = users.map(u => ({
          id: u._id ? u._id.toString() : '',
          usuario: u.usuario,
          nombre: u.nombre || u.usuario,
          rol: u.rol || 'user',
          createdAt: u.createdAt || null
        }));
        console.log(JSON.stringify({
          success: true,
          action: 'list',
          count: simplified.length,
          users: simplified
        }));
        break;
      }

      default:
        console.error(JSON.stringify({ error: `Comando desconocido: ${command}` }));
        process.exit(1);
    }
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

main();
