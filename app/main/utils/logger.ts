import { app } from 'electron';
import { mkdirSync } from 'fs';
import { join } from 'path';
import winston from 'winston';

const logBasePath =
  typeof app?.getPath === 'function'
    ? app.getPath('userData')
    : process.env.APPDATA
      ? join(process.env.APPDATA, 'tucajero')
      : process.cwd();
const logDir = join(logBasePath, 'logs');

mkdirSync(logDir, { recursive: true });

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: join(logDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`),
      maxFiles: 30,
    }),
  ],
});

if (process.env.NODE_ENV === 'development') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  );
}
