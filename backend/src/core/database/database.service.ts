import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db, Collection, type Document } from 'mongodb';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  private dbInstance!: Db;

  constructor() {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
    this.client = new MongoClient(mongoUrl);
  }

  async onModuleInit() {
    const dbName = process.env.DB_NAME || 'gastos-proyect';
    await this.client.connect();
    this.dbInstance = this.client.db(dbName);
    console.log(`[NestJS] Conectado exitosamente con MongoDB en base de datos: ${dbName}`);
  }

  async onModuleDestroy() {
    await this.client.close();
    console.log('[NestJS] Conexión con MongoDB cerrada');
  }

  get db(): Db {
    return this.dbInstance;
  }

  getCollection<T extends Document = Document>(name: string): Collection<T> {
    return this.dbInstance.collection<T>(name);
  }
}
