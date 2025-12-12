import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', error);

  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'Dados duplicados. Este registro já existe.',
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Registro não encontrado.',
    });
  }

  // Handle Prisma errors for missing tables/models
  if (error.code === 'P2001' || 
      error.message?.includes('does not exist') || 
      error.message?.includes('Unknown table') ||
      error.message?.includes('relation') && error.message?.includes('does not exist')) {
    return res.status(503).json({
      success: false,
      message: 'Database tables not initialized. Please run Prisma migrations.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      error: error.message,
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido',
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado',
    });
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Erro interno do servidor';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};
