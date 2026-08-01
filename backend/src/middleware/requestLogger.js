'use strict';

/**
 * HTTP request logger using morgan.
 * Uses 'dev' format in development, 'combined' in production.
 */

import morgan from 'morgan';

const format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

export const requestLogger = morgan(format);
