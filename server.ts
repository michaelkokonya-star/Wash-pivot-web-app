import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('--- Server Starting ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function startServer() {
  try {
    const app = express();
    const PORT = parseInt(process.env.PORT || '3000', 10);

    // API routes can go here
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('Starting in development mode with Vite middleware...');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      console.log('Starting in production mode...');
      const distPath = path.join(process.cwd(), 'dist');
      console.log(`Serving static files from: ${distPath}`);
      
      app.use(express.static(distPath));
      
      // Handle SPA routing - serve index.html for all non-API routes
      app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error('Error sending index.html:', err);
            res.status(500).send('Internal Server Error');
          }
        });
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is listening on 0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
