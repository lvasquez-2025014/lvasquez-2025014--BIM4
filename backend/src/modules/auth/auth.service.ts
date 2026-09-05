import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { UserService } from '../user/services/user.service.js';
import crypto from 'node:crypto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private googleClientId: string;

  constructor(@Inject(UserService) private readonly userService: UserService) {
    this.jwtSecret = process.env.JWT_SECRET || 'secret';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.googleClientId = process.env.GOOGLE_CLIENT_ID || '';
    this.googleClient = new OAuth2Client(this.googleClientId);
  }

  private getExpiresIn(): string | number {
    const raw = (process.env.JWT_EXPIRES_IN || this.jwtExpiresIn || '24h').toString().trim();
    // Si contiene únicamente dígitos, jsonwebtoken lo interpreta erróneamente como milisegundos.
    // Convertir a número asegura que se interprete correctamente como segundos.
    if (/^\d+$/.test(raw)) {
      return Number(raw);
    }
    return raw;
  }

  async login(usuario?: string, password?: string) {
    if (!usuario || !password) {
      throw new BadRequestException('Usuario y contraseña son obligatorios');
    }

    const valido = await this.userService.verificarCredenciales(usuario, password);
    if (!valido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const user = await this.userService.findByUsuario(usuario);
    const rol = user?.rol || 'user';
    const token = jwt.sign({ usuario, rol }, this.jwtSecret, { expiresIn: this.getExpiresIn() as any });

    return {
      token,
      usuario,
      nombre: user?.nombre || '',
      foto: user?.foto || '',
      rol,
    };
  }

  async loginWithGoogle(idToken?: string) {
    if (!idToken) {
      throw new BadRequestException('Token de Google requerido');
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleClientId,
      });
      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new UnauthorizedException('Token de Google inválido');
      }

      const email = payload.email;
      const nombre = payload.name || '';
      const foto = payload.picture || '';

      // 1. ¿El usuario que está ingresando con Google existe en mi base de datos?
      let user = await this.userService.findByUsuario(email);

      if (!user) {
        // Si NO existe: se crea como nuevo usuario (rol 'user')
        console.log(`[Google Auth] Usuario ${email} NO existe en la base de datos. Creándolo con rol 'user'...`);
        user = await this.userService.create(email, crypto.randomUUID(), nombre, 'user');
        if (foto) {
          await this.userService.updateProfile(email, { foto });
        }
      } else {
        // Si YA existe: se deja pasar respetando el rol que tiene registrado en la base de datos
        console.log(`[Google Auth] Usuario ${email} SÍ existe en la base de datos con rol '${user.rol}'. Acceso concedido.`);
        if (foto && !user.foto) {
          await this.userService.updateProfile(email, { foto });
        }
      }

      const rol = user.rol || 'user';
      const token = jwt.sign({ usuario: email, rol }, this.jwtSecret, { expiresIn: this.getExpiresIn() as any });

      return {
        token,
        usuario: email,
        nombre: user.nombre || nombre,
        foto: user.foto || foto,
        rol,
      };
    } catch (err) {
      console.error('[NestJS Auth] Error verificando token de Google:', err);
      throw new UnauthorizedException('Token de Google inválido o expirado');
    }
  }

  async refresh(usuario: string) {
    if (!usuario) {
      throw new UnauthorizedException('Token sin usuario');
    }
    const user = await this.userService.findByUsuario(usuario);
    const rol = user?.rol || 'user';
    const token = jwt.sign({ usuario, rol }, this.jwtSecret, { expiresIn: this.getExpiresIn() as any });
    return { token, usuario, rol };
  }

  async register(usuario?: string, password?: string) {
    if (!usuario || !password) {
      throw new BadRequestException('Usuario y contraseña son obligatorios');
    }

    const existente = await this.userService.findByUsuario(usuario);
    if (existente) {
      throw new ConflictException('El usuario ya existe');
    }

    const user = await this.userService.create(usuario, password, undefined, 'user');
    return { usuario: user.usuario, rol: user.rol };
  }
}
