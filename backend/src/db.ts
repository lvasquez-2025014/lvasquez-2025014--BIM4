import { MongoClient } from 'mongodb';

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'gastos-proyect';

export const client = new MongoClient(MONGO_URL);
export const db = client.db(DB_NAME);

export async function connectDB(): Promise<void> {
  await client.connect();
  console.log(`Conectado con la base de datos  ${MONGO_URL}/${DB_NAME}`);
}