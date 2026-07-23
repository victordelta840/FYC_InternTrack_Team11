import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtUserPayload | undefined, ctx: ExecutionContext): JwtUserPayload | string => {
    const req = ctx.switchToHttp().getRequest();
    const user: JwtUserPayload = req.user;
    if (!user) return undefined as unknown as JwtUserPayload;
    return data ? (user[data] as string) : user;
  },
);
