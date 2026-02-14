// authenticate the user for protected routes
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.status(401).json('Authentication required. Please login with GitHub.');
    }
}

// check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    } else {
        return res.status(403).json('Admin access required.');
    }
}

// Export
module.exports = {
    isAuthenticated,
    isAdmin
};