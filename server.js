const express = require('express');
const mongodb = require('./data/database');
const app = express();
const passport = require('passport');
const session = require('express-session');
const GitHubStrategy = require('passport-github2').Strategy;
const cors = require('cors');
const { ObjectId } = require('mongodb');
const { handleGitHubLogin } = require('./controllers/accountsController');

const port = process.env.PORT || 4000;

// Middleware Configuration // ============================================================================
// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport initialization 
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Z-Key, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH']
}));

// Passport & GitHub OAuth Configuration // ============================================================================
// GitHub OAuth strategy - auto-creates admin account on first login
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
},
async function(accessToken, refreshToken, profile, done) {
    try {
        // Handle GitHub login - auto-create if doesn't exist
        const user = await handleGitHubLogin(profile); // we add fields to profile
        return done(null, user);
        
    } catch (error) {
        console.error('Error in GitHub strategy:', error);
        return done(error, null);
    }
}));

// Serialize user - store only user ID in session
passport.serializeUser((user, done) => {
    done(null, user._id); // only the id for fewer data stored in session, and since it can be fetched from database.
});

// Deserialize user - fetch full user from database
passport.deserializeUser(async (id, done) => {
    try {
        const usersCollection = mongodb.getDatabase().db().collection('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(id) });
        done(null, user);
    } catch (error) {
        console.error('Error deserializing user:', error);
        done(error, null);
    }
});

// OAuth Routes // ============================================================================
// Initiate GitHub OAuth login
app.get('/auth/github/callback', 
    passport.authenticate('github', { scope: ['user:email'] })
);

// GitHub OAuth callback
app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    function(req, res) {
        // Set user session
        req.session.user = {
            _id: req.user._id,
            username: req.user.username,
            role: req.user.role
        };
        
        // Redirect to index
        res.redirect('/');
    }
);  

// Routes // ============================================================================
// Home route - display login status
app.get('/', (req, res) => {
    if (req.session && req.session.user) {
        res.send(`Logged in as ${req.session.user.username} (${req.session.user.role})`);
    } else {
        res.send('Not logged in - <a href="/auth/github">Login with GitHub</a>'); // directly provide the link
    }
});

// Application routes
app.use('/', require('./routes'));

// Error Handling // ============================================================================
process.on('uncaughtException', (err, origin) => {
    console.error(`Caught exception: ${err}\nException origin: ${origin}`);
});

// Database Connection & Server Initialization // ============================================================================
mongodb.initDB((err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        app.listen(port, () => {
            console.log(`Database connected and server running on port ${port}`);
        });
    }
});