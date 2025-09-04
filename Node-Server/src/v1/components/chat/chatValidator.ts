import { NextFunction, Request, Response } from "express";
import Joi from "joi";

export const getConversationsSchema = Joi.object({
    userIds: Joi.array().items(Joi.string().required()).min(1).required(),
    paginationDetails: Joi.object({
        page: Joi.number().integer().min(1).required(),
        limit: Joi.number().integer().min(1).required()
    })
})


export const validateGetConversations = (req: Request, res: Response, next: NextFunction) => {
    const { error } = getConversationsSchema.validate(req.body);
    if (error) {
        res.status(400).json({ error: error.details[0].message });
    } else {
        next();
    }
}