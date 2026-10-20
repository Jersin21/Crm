const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { sequelize } = require('./models');
const errorHandler = require('./middleware/errorHandler');

// Rutas
const authRoutes = require('./routes/authRoutes');
const asociacionRoutes = require('./routes/asociacionRoutes');
const socioRoutes = require('./routes/socioRoutes');
const consumoLuzRoutes = require('./routes/consumoLuzRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const asistenciaRoutes = require('./routes/asistenciaRoutes');
const cargoRoutes = require('./routes/cargoRoutes');
const ingresoRoutes = require('./routes/ingresoRoutes');
const egresoRoutes = require('./routes/egresoRoutes');
const tipoEgresoRoutes = require('./routes/tipoEgresoRoutes');
const conceptoCobroRoutes = require('./routes/conceptoCobroRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const aporteRoutes = require('./routes/aporteRoutes');

let usuarioRoutes;
try {
  usuarioRoutes = require('./routes/usuarioRoutes');
} catch (e) {
  usuarioRoutes = null;
}

const app = express();

// 1. Compresión de payload con Gzip/Brotli (Reducción drástica de ancho de banda)
app.use(
  compression({
    level: 6, // Nivel óptimo entre compresión y uso de CPU
    threshold: 1024, // Solo comprimir respuestas > 1 KB
  })
);

// 2. Blindaje de cabeceras HTTP con Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Configuración estricta de CORS según FRONTEND_URL
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir peticiones sin header de origen (herramientas locales, apps o scripts de pruebas)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por política CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// 3. Limitadores de Tasa (Rate Limiting)
// Limitador estricto para login (Previene ataques de fuerza bruta):
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'test' ? 100 : 50,
  skipSuccessfulRequests: true, // Logins exitosos no consumen la cuota de penalización
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    mensaje: 'Demasiados intentos de inicio de sesión fallidos. Por seguridad, su IP ha sido bloqueada temporalmente por 15 minutos.',
  },
});

// Limitador general: 100 peticiones por minuto por IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 120, // 120 peticiones por minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    mensaje: 'Demasiadas solicitudes desde esta dirección IP. Por favor intente de nuevo en un minuto.',
  },
  skip: (req) => process.env.NODE_ENV === 'test' || req.path === '/api/health',
});

app.use(generalLimiter);
app.use('/api/auth/login', loginLimiter);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    mensaje: 'MiSocios Backend API en funcionamiento con seguridad bancaria',
    timestamp: new Date().toISOString(),
  });
});

// Montar Rutas
app.use('/api/auth', authRoutes);
app.use('/api/asociaciones', asociacionRoutes);
app.use('/api/socios', socioRoutes);
app.use('/api/consumo-luz', consumoLuzRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/asistencias', asistenciaRoutes);
app.use('/api/cargos', cargoRoutes);
app.use('/api/ingresos', ingresoRoutes);
app.use('/api/egresos', egresoRoutes);
app.use('/api/tipos-egreso', tipoEgresoRoutes);
app.use('/api/tipo-egreso', tipoEgresoRoutes);
app.use('/api/conceptos-cobro', conceptoCobroRoutes);
app.use('/api/conceptos', conceptoCobroRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/aportes', aporteRoutes);

if (usuarioRoutes) {
  app.use('/api/usuarios', usuarioRoutes);
}

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// 4. Middleware Global Centralizado de Manejo de Errores (Anti-Fugas de SQL)
app.use(errorHandler);

const { iniciarCronJobs, detenerCronJobs } = require('./services/cronService');

const PORT = process.env.PORT || 3031;
let server = null;

if (require.main === module) {
  sequelize
    .authenticate()
    .then(() => {
      console.log('Conexión a la base de datos MySQL establecida correctamente.');
      iniciarCronJobs();
      server = app.listen(PORT, () => {
        console.log(`Servidor MiSocios escuchando en el puerto ${PORT}`);
        console.log(`URL base: http://localhost:${PORT}/api`);
      });
    })
    .catch((err) => {
      console.error('No se pudo conectar a la base de datos MySQL:', err);
      server = app.listen(PORT, () => {
        console.log(`Servidor MiSocios iniciado en puerto ${PORT} (sin conexión activa a BD)`);
      });
    });

  // Cierre ordenado de servidor (Graceful Shutdown para contenedores y PM2)
  const shutdown = async (signal) => {
    console.log(`\nRecibida señal ${signal}. Iniciando apagado ordenado del servidor...`);
    detenerCronJobs();
    if (server) {
      server.close(async () => {
        console.log('Servidor HTTP cerrado.');
        try {
          await sequelize.close();
          console.log('Conexiones a MySQL cerradas.');
          process.exit(0);
        } catch (dbErr) {
          console.error('Error al cerrar base de datos:', dbErr);
          process.exit(1);
        }
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
