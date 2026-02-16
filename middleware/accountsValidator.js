const validator = require('../helpers/validate');

// Validate update user request
const validateUpdateUser = (req, res, next) => {
    const validationRules = {
        role: 'string|in:admin,user',
        'profile.displayName': 'string',
        'profile.avatar': 'url'
    };
    
    validator(req.body, validationRules, {}, (err, status) => {
        if (!status) {
            return res.status(412).json({
                success: false,
                message: 'Validation failed',
                data: err
            });
        }
        next();
    });
};

module.exports = {
    validateUpdateUser
};