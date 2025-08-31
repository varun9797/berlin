import joi from "joi";
import { Request, Response, NextFunction } from "express";

const registrationSchema = joi.object({
    username: joi.string().alphanum().min(3).max(30).required(),
    email: joi.string().email().required(),
    password: joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required()
});

export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
    const { error } = registrationSchema.validate(req.body);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }
    next();
}

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
    const loginSchema = joi.object({
        username: joi.string().alphanum().min(3).max(30).required(),
        password: joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required()
    });

    const { error } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }
    next();
}