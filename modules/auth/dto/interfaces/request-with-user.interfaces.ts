import { Request } from 'express';
import { JwtPayLoad } from './jwt-payload.interface';

export interface RequestWithUser extends Request {
  user: JwtPayLoad;
}
