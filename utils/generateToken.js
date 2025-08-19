import jwt from 'jsonwebtoken';

const generateToken = (id) =>
    jwt.sign(
        {id},
        process.env.JWT_SECRECT,
        {expiresIn: '15d',}
    );

export default generateToken;
