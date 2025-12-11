import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Body,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { KeycloakService } from '../services/keycloak.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth/sso')
@Controller('api/auth/sso')
export class SsoController {
  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly configService: ConfigService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Get SSO configuration' })
  getConfig() {
    return {
      keycloak: this.keycloakService.getConfig(),
    };
  }

  @Get('authorize')
  @ApiOperation({ summary: 'Redirect to Keycloak login' })
  authorize(@Res() res: Response) {
    if (!this.keycloakService.isEnabled()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'SSO is not configured',
      });
    }

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const redirectUri = `${frontendUrl}/auth/sso/callback`;
    const state = Math.random().toString(36).substring(7);

    // Store state in cookie for CSRF protection
    res.cookie('sso_state', state, { httpOnly: true, maxAge: 600000 });

    const authUrl = this.keycloakService.getAuthorizationUrl(redirectUri, state);
    return res.redirect(HttpStatus.TEMPORARY_REDIRECT, authUrl);
  }

  @Get('callback')
  @ApiOperation({ summary: 'SSO callback handler' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

    try {
      if (!code) {
        throw new UnauthorizedException('No authorization code provided');
      }

      const redirectUri = `${frontendUrl}/auth/sso/callback`;

      // Exchange code for tokens
      const tokens = await this.keycloakService.exchangeCodeForTokens(code, redirectUri);

      // Get user info
      const userInfo = await this.keycloakService.getUserInfo(tokens.accessToken);

      // Find or create user
      const user = await this.keycloakService.findOrCreateUser(userInfo);

      // Generate local JWT
      const localTokens = await this.keycloakService.generateLocalTokens(user.id, user.email);

      // Redirect to frontend with tokens
      return res.redirect(
        `${frontendUrl}/auth/sso/success?token=${localTokens.accessToken}&refresh=${localTokens.refreshToken}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SSO authentication failed';
      return res.redirect(`${frontendUrl}/auth/sso/error?message=${encodeURIComponent(message)}`);
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout from Keycloak' })
  async logout(@Body('refreshToken') refreshToken: string) {
    if (refreshToken) {
      await this.keycloakService.logout(refreshToken);
    }
    return { success: true };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh Keycloak tokens' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const tokens = await this.keycloakService.refreshToken(refreshToken);
    return {
      success: true,
      ...tokens,
    };
  }
}
