import * as functions from 'firebase-functions';
import express, { Request, Response } from 'express';

const app = express();

// Exemplo de rota migrada do backend
app.get('/api/v1/hello', (req: Request, res: Response) => {
  res.json({ message: 'Olá do backend via Firebase Functions!' });
});

// TODO: Migrar rotas do backend-ts para cá
// Exemplo:
// app.get('/api/v1/musics', ...)
// app.post('/api/v1/auth', ...)

export const api = functions.https.onRequest(app);
