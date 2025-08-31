import { Request, Response } from "express";
import { UserModel } from "./userModel";
import jwt from "jsonwebtoken";
import { httpStatusCodes } from "../../utils/httpStatusCodes";
import { users } from "../../services/chatService";

export const userRegistration = async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;

        const newUser = new UserModel({ username, email, password });
        await newUser.save();
        res.send({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).send({ message: "Internal server error" });
    }

}

export const getUserProfile = async (req: Request, res: Response) => {
    const data = await UserModel.find();
    res.send(data)
}

export const getOnlineUsers = async (req: Request, res: Response) => {
    const onlineUsers = users
    res.status(httpStatusCodes.OK).send(onlineUsers);
}

export const userLogin = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const user = await UserModel.findOne({ username });
    if (!user) {
        return res.status(httpStatusCodes.NOT_FOUND).send("Something went wrong");
    } else {
        const isMatch = user.comparePassword(password);
        if (!isMatch) {
            return res.status(httpStatusCodes.UNAUTHORIZED).send("Invalid credentials");
        } else {
            const token = jwt.sign(
                { username: user.username }, process.env.JWT_SECRET || "default", { expiresIn: '1h' });
            // res.setHeader("Authorization", `Bearer ${token}`);
            // res.setHeader('Access-Control-Expose-Headers', 'Authorization'); // optional if using `exposedHeaders` in cors

            const refreshToken = jwt.sign(
                { username: user.username }, process.env.JWT_REFRESH_SECRET || "default", { expiresIn: '1h' });
            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.PRODUCTION === 'true', // Set to true in production
                sameSite: process.env.PRODUCTION === 'true' ? 'strict' : 'lax'
            });

            return res.status(httpStatusCodes.OK).send({
                message: "Login successful", token: `Bearer ${token}`
            });
        }
    }
}