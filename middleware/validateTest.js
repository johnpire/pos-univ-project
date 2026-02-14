const validator = require('../helpers/validate');

const saveTest = (req, res, next) => {
    const validationRule = {
        name: 'required|string',
        value: 'required|numeric',
        age: 'required|numeric',
        email: 'required|email',
        isActive: 'required|boolean',
        role: 'required|string',
        createdAt: 'required|date'
    };
    validator(req.body, validationRule, {}, (err, status) => {
        if (!status) {
            res.status(422).json({
                success: false,
                message: 'Validation failed',
                data: err
            });
        } else {
            next();
        }
    });
}

module.exports = {
    saveTest
};