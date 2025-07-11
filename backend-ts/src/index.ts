import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { ENV } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import route modules
import musicRoutes from './modules/music/music.routes';
import ministerRoutes from './modules/ministers/minister.routes';
import userRoutes from './modules/users/user.routes';
import authRoutes from './modules/auth/auth.routes';
import roleRoutes from './modules/roles/role.routes';
// import setlistRoutes from './modules/setlists/setlist.routes';
// import transposeRoutes from './modules/transpose/transpose.routes';

// Create Express app
const app = express();

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Louvor IDE API',
      version: '1.0.0',
      description: 'API completa para gerenciamento de cifras musicais, ministros, usuários e setlists',
      contact: {
        name: 'Louvor IDE Team',
        email: 'contato@louvoride.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${ENV.PORT}${ENV.API.PREFIX}`,
        description: 'Servidor de Desenvolvimento',
      },
      {
        url: 'https://louvor-ide-api.vercel.app/api/v1',
        description: 'Servidor de Produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Music: {
          type: 'object',
          required: ['titulo', 'artista', 'tom', 'cifra', 'ministros'],
          properties: {
            id: { type: 'string', description: 'ID único da música' },
            titulo: { type: 'string', description: 'Título da música' },
            artista: { type: 'string', description: 'Nome do artista' },
            tom: { type: 'string', enum: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] },
            bpm: { type: 'integer', minimum: 60, maximum: 200 },
            link: { type: 'string', format: 'uri' },
            cifra: { type: 'string', description: 'Cifra da música' },
            ministros: { type: 'array', items: { type: 'string' } },
            tomMinistro: { type: 'object', additionalProperties: { type: 'string' } },
            status: { type: 'string', enum: ['ativo', 'inativo'] },
            tags: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Minister: {
          type: 'object',
          required: ['nome', 'instrumento'],
          properties: {
            id: { type: 'string' },
            nome: { type: 'string' },
            email: { type: 'string', format: 'email' },
            telefone: { type: 'string' },
            instrumento: { type: 'array', items: { type: 'string' } },
            tomPreferido: { type: 'string', enum: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] },
            status: { type: 'string', enum: ['ativo', 'inativo'] },
            avatar: { type: 'string', format: 'uri' },
            observacoes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
        AuthUser: {
          type: 'object',
          properties: {
            uid: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            picture: { type: 'string', format: 'uri' },
            emailVerified: { type: 'boolean' },
            role: { type: 'string', enum: ['admin', 'minister', 'user'] },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            details: { type: 'object' },
          },
        },
      },
    },
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: ENV.RATE_LIMIT.WINDOW_MS,
  max: ENV.RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    error: 'Muitas requisições feitas, tente novamente mais tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// CORS
app.use(cors({
  origin: ENV.CORS.ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging
app.use(morgan('combined'));
app.use(requestLogger);

// Swagger documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Louvor IDE API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
  },
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Louvor IDE API está funcionando!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: ENV.NODE_ENV,
  });
});

// API routes with versioning
app.use(`${ENV.API.PREFIX}/music`, musicRoutes);
app.use(`${ENV.API.PREFIX}/ministers`, ministerRoutes);
app.use(`${ENV.API.PREFIX}/users`, userRoutes);
app.use(`${ENV.API.PREFIX}/auth`, authRoutes);
app.use(`${ENV.API.PREFIX}/roles`, roleRoutes);
// app.use(`${ENV.API.PREFIX}/setlists`, setlistRoutes);
// app.use(`${ENV.API.PREFIX}/transpose`, transposeRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bem-vindo à Louvor IDE API!',
    documentation: '/docs',
    health: '/health',
    version: '1.0.0',
    endpoints: {
      music: `${ENV.API.PREFIX}/music`,
      ministers: `${ENV.API.PREFIX}/ministers`,
      users: `${ENV.API.PREFIX}/users`,
      auth: `${ENV.API.PREFIX}/auth`,
      setlists: `${ENV.API.PREFIX}/setlists`,
      transpose: `${ENV.API.PREFIX}/transpose`,
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = ENV.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Louvor IDE API rodando em http://localhost:${PORT}`);
  console.log(`📚 Documentação disponível em http://localhost:${PORT}/docs`);
  console.log(`🏥 Health check em http://localhost:${PORT}/health`);
  console.log(`🌍 Ambiente: ${ENV.NODE_ENV}`);
});

export default app;
