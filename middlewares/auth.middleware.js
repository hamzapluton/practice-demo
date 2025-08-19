import jwt from "jsonwebtoken";
import {JWT_ERRORS} from "#constants/user";
import { sockets } from "../server.js";


const authMiddleware = (req, res, next) => {
    if (!process.env.REQUIRES_AUTH)
        return next();
    const token = req.header('x-auth-token') || req.cookies['x-auth-token'];
    if (!token)
        return res.status(401).send("Access denied. No token provided.");
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRECT);
        next();
    } catch (ex) {
        if (ex.message === "jwt expired")   
       { 
        sockets.sendSessionExpired(token);
        return res.status(401).send("Jwt Token is Expired");
       }
       res.status(401).send("Invalid token.");
    }
};

export default authMiddleware
