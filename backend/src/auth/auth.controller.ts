import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterStudentDto } from './auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';

const REFRESH_COOKIE = 'itk_refresh';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Student/Mentor portal login */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password, 'PORTAL');
    this.setRefreshCookie(res, result.tokens.refreshToken, result.tokens.refreshExpiresIn);
    return {
      accessToken: result.tokens.accessToken,
      accessExpiresIn: result.tokens.accessExpiresIn,
      user: result.user,
    };
  }

  /** ADMIN-only isolated gateway */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto.email, dto.password, 'ADMIN');
    this.setRefreshCookie(res, result.tokens.refreshToken, result.tokens.refreshExpiresIn);
    return {
      accessToken: result.tokens.accessToken,
      accessExpiresIn: result.tokens.accessExpiresIn,
      user: result.user,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterStudentDto) {
    return this.auth.registerStudent(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req.cookies?.[REFRESH_COOKIE] as string) || dto.refreshToken;
    if (!token) throw new UnauthorizedException('Missing refresh token');
    const payload = this.auth.verifyRefresh(token);
    if (payload.typ !== 'refresh') throw new UnauthorizedException('Invalid token type');
    const tokens = await this.auth.refresh(payload.sub, token);
    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresIn);
    return { accessToken: tokens.accessToken, accessExpiresIn: tokens.accessExpiresIn };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: JwtUserPayload, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user.sub);
    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict', secure: false, path: '/' });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: JwtUserPayload) {
    return this.auth.me(user.sub);
  }

  private setRefreshCookie(res: Response, token: string, ttlSec: number) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ttlSec * 1000,
    });
  }
}
