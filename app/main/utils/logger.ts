import winston from 'winston';

import { ensureDir, getLogsDir } from './paths';

const logDir = ensureDir(getLogsDir());

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({
      filename: `${logDir}/error.log`,
      level: 'error',
    }),
    new winston.transports.File({
      filename: `${logDir}/app-${new Date().toISOString().split('T')[0]}.log`,
      maxFiles: 30,
    }),
  ],
});
