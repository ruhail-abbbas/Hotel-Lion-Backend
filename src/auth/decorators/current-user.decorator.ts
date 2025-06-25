/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
