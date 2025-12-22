import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      console.error('Validation error:', error.details);
      console.error('Request body:', JSON.stringify(req.body, null, 2));
      
      const errorMessages = error.details.map(detail => detail.message);
      const errorMessage = errorMessages.length === 1
        ? errorMessages[0]
        : `Erros de validação: ${errorMessages.join('; ')}`;
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        error: errorMessages.join(', '),
        details: error.details.map(detail => ({
          message: detail.message,
          path: detail.path,
          type: detail.type,
        })),
      });
    }
    
    req.body = value;
    return next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros de consulta inválidos',
        error: error.details[0].message,
      });
    }
    
    return next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros inválidos',
        error: error.details[0].message,
      });
    }
    
    return next();
  };
};
