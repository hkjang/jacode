import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

export interface KeycloakConfig {
  enabled: boolean;
  serverUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
}

export interface KeycloakUserInfo {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
  realm_access?: {
    roles: string[];
  };
}

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private readonly config: KeycloakConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      enabled: !!this.configService.get('KEYCLOAK_SERVER_URL'),
      serverUrl: this.configService.get('KEYCLOAK_SERVER_URL') || '',
      realm: this.configService.get('KEYCLOAK_REALM') || 'jacode',
      clientId: this.configService.get('KEYCLOAK_CLIENT_ID') || 'jacode-client',
      clientSecret: this.configService.get('KEYCLOAK_CLIENT_SECRET') || '',
    };

    if (this.config.enabled) {
      this.logger.log(`Keycloak SSO enabled: ${this.config.serverUrl}/realms/${this.config.realm}`);
    } else {
      this.logger.log('Keycloak SSO not configured');
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): { enabled: boolean; realm: string } {
    return {
      enabled: this.config.enabled,
      realm: this.config.realm,
    };
  }

  // Generate Keycloak authorization URL
  getAuthorizationUrl(redirectUri: string, state: string): string {
    if (!this.config.enabled) {
      throw new UnauthorizedException('Keycloak SSO is not configured');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      response_type: 'code',
      state,
    });

    return `${this.config.serverUrl}/realms/${this.config.realm}/protocol/openid-connect/auth?${params.toString()}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken: string;
    idToken: string;
  }> {
    if (!this.config.enabled) {
      throw new UnauthorizedException('Keycloak SSO is not configured');
    }

    const tokenUrl = `${this.config.serverUrl}/realms/${this.config.realm}/protocol/openid-connect/token`;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Keycloak token exchange failed: ${error}`);
      throw new UnauthorizedException('Failed to exchange code for tokens');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
    };
  }

  // Get user info from Keycloak
  async getUserInfo(accessToken: string): Promise<KeycloakUserInfo> {
    if (!this.config.enabled) {
      throw new UnauthorizedException('Keycloak SSO is not configured');
    }

    const userInfoUrl = `${this.config.serverUrl}/realms/${this.config.realm}/protocol/openid-connect/userinfo`;

    const response = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to get user info from Keycloak');
    }

    return response.json();
  }

  // Validate Keycloak access token
  async validateToken(accessToken: string): Promise<KeycloakUserInfo | null> {
    try {
      const userInfo = await this.getUserInfo(accessToken);
      return userInfo;
    } catch {
      return null;
    }
  }

  // Refresh access token
  async refreshToken(refreshTokenValue: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    if (!this.config.enabled) {
      throw new UnauthorizedException('Keycloak SSO is not configured');
    }

    const tokenUrl = `${this.config.serverUrl}/realms/${this.config.realm}/protocol/openid-connect/token`;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshTokenValue,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to refresh token');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  // Logout from Keycloak
  async logout(refreshTokenValue: string): Promise<void> {
    if (!this.config.enabled) return;

    const logoutUrl = `${this.config.serverUrl}/realms/${this.config.realm}/protocol/openid-connect/logout`;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshTokenValue,
    });

    try {
      await fetch(logoutUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    } catch (error) {
      this.logger.warn(`Keycloak logout failed: ${error}`);
    }
  }

  // Find or create user from Keycloak info
  async findOrCreateUser(userInfo: KeycloakUserInfo) {
    let user = await this.prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (!user) {
      // Create new user from Keycloak
      const name = userInfo.name || 
        `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim() ||
        userInfo.preferred_username;

      user = await this.prisma.user.create({
        data: {
          email: userInfo.email,
          name,
          password: await bcrypt.hash(Math.random().toString(36), 10), // Random password for SSO users
        },
      });
      this.logger.log(`Created new user from Keycloak: ${userInfo.email}`);
    }

    return user;
  }

  // Generate local JWT tokens for the user
  async generateLocalTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }
}
