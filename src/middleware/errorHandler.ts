import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const err = error as { code?: string; name?: string; message?: string; statusCode?: number; stack?: string };
  console.error('Error:', error);

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Dados duplicados. Este registro já existe.',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Registro não encontrado.',
    });
  }

  // Handle Prisma errors for missing tables/models
  if (err.code === 'P2001' || 
      err.message?.includes('does not exist') || 
      err.message?.includes('Unknown table') ||
      err.message?.includes('relation') && err.message?.includes('does not exist')) {
    return res.status(503).json({
      success: false,
      message: 'Database tables not initialized. Please run Prisma migrations.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      error: err.message,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
