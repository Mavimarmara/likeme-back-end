import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '@/types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Sucesso',
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string = 'Erro interno do servidor',
  statusCode: number = 500,
  error?: string
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
  };
  res.status(statusCode).json(response);
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  message: string = 'Sucesso'
): void => {
  const response: PaginatedResponse<T> = {
    data,
    pagination,
  };
  
  const apiResponse: ApiResponse<PaginatedResponse<T>> = {
    success: true,
    message,
    data: response,
  };
  
  res.status(200).json(apiResponse);
};
