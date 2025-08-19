import { sockets } from "../server.js";

const admin = (req, res, next) => {
    
        const token = req.header('x-auth-admin') || req.cookies['x-auth-admin'];
        if (!token)
            return res.status(401).send("Access denied.");
            if(token === "admin"){
                next();
            }else{
                return res.status(401).send("Access denied");   
            }
    };
    

export {admin}