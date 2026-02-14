const { ObjectId } = require('mongodb');
const mongodb = require('../data/database');

// LOGIN - Login user (GitHub OAuth only - handled by Passport)
// This function is called after successful GitHub OAuth
const handleGitHubLogin = async (githubProfile) => {
    try {
        const usersCollection = mongodb.getDatabase().db().collection('users');
        
        // Check if user exists
        let user = await usersCollection.findOne({ 'oauth.githubId': githubProfile.id });
        
        if (user) {
            // Update last login
            await usersCollection.updateOne(
                { _id: user._id },
                { $set: { lastLogin: new Date() } }
            );
            return user;
        }
        
        // Auto-create new admin account
        const newUser = {
            username: githubProfile.username,
            role: 'admin',
            oauth: {
                githubId: githubProfile.id,
                githubUsername: githubProfile.username
            },
            profile: {
                displayName: githubProfile.displayName || githubProfile.username,
                avatar: githubProfile.photos?.[0]?.value || ''
            },
            createdAt: new Date(),
            lastLogin: new Date()
        };
        
        const result = await usersCollection.insertOne(newUser);
        newUser._id = result.insertedId;
        
        return newUser;
        
    } catch (error) {
        console.error('Error handling GitHub login:', error);
        throw error;
    }
};

// LOGOUT - Logout user
const logoutUser = async (req, res) => {
    //#swagger.tags = ['Users']
    try { // passport purpose in the code is for authentication, not login, so .logout() will not work, so we destroy the session instead.
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Error destroying session:', err);
                    return res.status(500).json({ error: 'Failed to logout' });
                }
                res.status(200).json({ message: 'Logout successful' });
            });
        } else {
            res.status(200).json({ message: 'No active session' });
        }
        
    } catch (error) {
        console.error('Error logging out user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// READ - Get all users
const getAllUsers = async (req, res) => {
    //#swagger.tags = ['Users']
    try {
        const usersCollection = mongodb.getDatabase().db().collection('users');
        
        const users = await usersCollection.find({})
            .sort({ createdAt: -1 })
            .toArray();
        
        res.status(200).json({
            count: users.length,
            users
        });
        
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// READ - Get single user by ID (admin only)
const getUserById = async (req, res) => {
    //#swagger.tags = ['Users']
    try {
        const userId = new ObjectId(req.params.id);
        
        const usersCollection = mongodb.getDatabase().db().collection('users');
        const user = await usersCollection.findOne({ _id: userId });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.status(200).json(user);
        
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// UPDATE - Update user by ID
const updateUser = async (req, res) => {
    //#swagger.tags = ['Users']
    try {
        const { role, profile } = req.body;
        const userId = new ObjectId(req.params.id);
        
        const updateData = {
            role,
            profile,
            updatedAt: new Date()
        };
        
        const usersCollection = mongodb.getDatabase().db().collection('users');
        const result = await usersCollection.updateOne(
            { _id: userId },
            { $set: updateData }
        );
        
        const updatedUser = await usersCollection.findOne({ _id: userId });
        
        if (result.matchedCount > 0) {
            res.status(200).json({
                message: 'User updated successfully',
                user: updatedUser
            });
        } else {
            return res.status(404).json({ error: 'User not found' });
        }
        
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// DELETE - Delete user by ID (admin only)
const deleteUser = async (req, res) => {
    //#swagger.tags = ['Users']
    try {
        const userId = new ObjectId(req.params.id);
        const usersCollection = mongodb.getDatabase().db().collection('users');
        
        const user = await usersCollection.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await usersCollection.deleteOne({ _id: userId });
        
        res.status(200).json({
            message: 'User deleted successfully',
            userId
        });
        
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Export
module.exports = {
    handleGitHubLogin,
    logoutUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
};