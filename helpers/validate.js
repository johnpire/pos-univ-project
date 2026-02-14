const Validator = require('validatorjs');
const validator = (data, validationRule, customMessages, callback) => {
    const validation = new Validator(data, validationRule, customMessages);
    validation.passes(() => callback(null, true));
    validation.fails(() => callback(validation.errors, false));
};

module.exports = validator;