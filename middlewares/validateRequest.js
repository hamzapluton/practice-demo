export const validateRequest = (schema, isUserIdRequiredInBody) => (req, res, next) => {
    if (req.user && req.user.id) {
        isUserIdRequiredInBody ? req.body.userId = req.user.id : req.userId = req.user.id;
    }
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: false,
            message: "Validation error. " + (error.details.map(detail => detail.message)).join(" "),
            details: (error.details.map(detail => detail.message)).join(" "),
        });
    }
    next();
};
