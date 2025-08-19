import formatDate from "#utils/formatDate";

const log = (req, res, next) => {
    const date = new Date();
    console.log(`${req.method} : ${req.originalUrl} :${formatDate(date)}`);
    next();
}


export default log