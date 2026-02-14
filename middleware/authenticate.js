const isAuthenticated = (req, res, next) => {
    if (req.session.user === undefined) {
        return res.status(401).json('You do not have permission to perform this action');
    }
    next();
}

module.exports = { isAuthenticated };