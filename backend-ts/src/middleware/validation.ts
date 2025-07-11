import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponse } from '../types';

export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: `Validation error: ${error.details.map(d => d.message).join(', ')}`,
      };
      return res.status(400).json(response);
    } else {
      req.body = value;
      next();
      return;
    }
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: `Query validation error: ${error.details.map(d => d.message).join(', ')}`,
      };
      return res.status(400).json(response);
    } else {
      req.query = value;
      next();
      return;
    }
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params);
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: `Params validation error: ${error.details.map(d => d.message).join(', ')}`,
      };
      return res.status(400).json(response);
    } else {
      req.params = value;
      next();
      return;
    }
  };
};

export const validateRequest = (schemas: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Validate body
    if (schemas.body) {
      const { error: bodyError, value: bodyValue } = schemas.body.validate(req.body);
      if (bodyError) {
        const response: ApiResponse = {
          success: false,
          error: `Body validation error: ${bodyError.details.map(d => d.message).join(', ')}`,
        };
        return res.status(400).json(response);
      }
      req.body = bodyValue;
    }

    // Validate query
    if (schemas.query) {
      const { error: queryError, value: queryValue } = schemas.query.validate(req.query);
      if (queryError) {
        const response: ApiResponse = {
          success: false,
          error: `Query validation error: ${queryError.details.map(d => d.message).join(', ')}`,
        };
        return res.status(400).json(response);
      }
      req.query = queryValue;
    }

    // Validate params
    if (schemas.params) {
      const { error: paramsError, value: paramsValue } = schemas.params.validate(req.params);
      if (paramsError) {
        const response: ApiResponse = {
          success: false,
          error: `Params validation error: ${paramsError.details.map(d => d.message).join(', ')}`,
        };
        return res.status(400).json(response);
      }
      req.params = paramsValue;
    }
    
    return;
    next();
  };
};
