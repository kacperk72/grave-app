import * as Joi from 'joi';

export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(0).default(3000),
  SUPABASE_URL: Joi.string().uri().allow('').default(''),
  SUPABASE_SERVICE_KEY: Joi.string().allow('').default(''),
  SUPABASE_PUBLIC_KEY: Joi.string().allow('').default(''),
  DATABASE_URL: Joi.alternatives().try(Joi.string().uri(), Joi.string().allow('')).default(''),
});
