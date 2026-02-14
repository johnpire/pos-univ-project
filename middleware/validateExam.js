const validator = require('../helpers/validate');

const saveExam = (req, res, next) => {
    const validationRule = {
        name: 'required|string',
        number: 'required|numeric',
        email: 'required|email'
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
    saveExam
};