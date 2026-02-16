// tests/unit/users.test.js

const { ObjectId } = require('mongodb');

// Mock the database module
const mockGetDatabase = jest.fn();
jest.mock('../../data/database', () => ({
  getDatabase: () => mockGetDatabase()
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)  // ← Add return value
}));

const bcrypt = require('bcrypt');

// Import controller AFTER mocking
const {
  handleGitHubLogin,
  logoutUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../../controllers/accountsController');

describe('Accounts Controller - Unit Tests', () => {
  let req, res, mockCollection;
  
  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      session: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockCollection = {
      insertOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn().mockReturnThis(),
      toArray: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis()
    };
    
    mockGetDatabase.mockReturnValue({
      db: () => ({
        collection: () => mockCollection
      })
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // TEST: handleGitHubLogin
  describe('handleGitHubLogin', () => {
    it('should return existing user and update last login', async () => {
      const githubProfile = {
        id: '12345',
        username: 'johndoe',
        displayName: 'John Doe',
        photos: [{ value: 'https://avatar.url' }]
      };
      
      const mockExistingUser = {
        _id: new ObjectId('707f1f77bcf86cd799439031'),
        username: 'johndoe',
        oauth: {
          githubId: '12345',
          githubUsername: 'johndoe'
        }
      };
      
      mockCollection.findOne.mockResolvedValue(mockExistingUser);
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      
      const result = await handleGitHubLogin(githubProfile);
      
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        'oauth.githubId': '12345'
      });
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: mockExistingUser._id },
        expect.objectContaining({
          $set: { lastLogin: expect.any(Date) }
        })
      );
      expect(result).toEqual(mockExistingUser);
    });
    
    it('should create new admin user on first GitHub login', async () => {
      const githubProfile = {
        id: '67890',
        username: 'newuser',
        displayName: 'New User',
        photos: [{ value: 'https://avatar.url' }]
      };
      
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId('707f1f77bcf86cd799439032')
      });
      
      const result = await handleGitHubLogin(githubProfile);
      
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          role: 'admin',
          oauth: {
            githubId: '67890',
            githubUsername: 'newuser'
          },
          profile: expect.objectContaining({
            displayName: 'New User'
          })
        })
      );
      expect(result.username).toBe('newuser');
      expect(result.role).toBe('admin');
    });
    
    it('should handle GitHub profile without photos', async () => {
      const githubProfile = {
        id: '99999',
        username: 'nophoto',
        displayName: 'No Photo User',
        photos: []
      };
      
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });
      
      const result = await handleGitHubLogin(githubProfile);
      
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: expect.objectContaining({
            avatar: ''
          })
        })
      );
    });
    
    it('should throw error on database failure', async () => {
      const githubProfile = {
        id: '12345',
        username: 'johndoe'
      };
      
      mockCollection.findOne.mockRejectedValue(new Error('DB error'));
      
      await expect(handleGitHubLogin(githubProfile)).rejects.toThrow('DB error');
    });
  });
  
  // TEST: logoutUser
  describe('logoutUser', () => {
    it('should destroy session and logout user', async () => {
      req.session = {
        destroy: jest.fn((callback) => callback(null))
      };
      
      await logoutUser(req, res);
      
      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logout successful' });
    });
    
    it('should handle session destroy error', async () => {
      req.session = {
        destroy: jest.fn((callback) => callback(new Error('Session error')))
      };
      
      await logoutUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to logout' });
    });
    
    it('should handle no active session', async () => {
      req.session = null;
      
      await logoutUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'No active session' });
    });
  });
  
  // TEST: getAllUsers
  describe('getAllUsers', () => {
    it('should get all users without password hashes', async () => {
      const mockUsers = [
        {
          _id: new ObjectId(),
          username: 'user1',
          role: 'admin'
        },
        {
          _id: new ObjectId(),
          username: 'user2',
          role: 'admin'
        }
      ];
      
      mockCollection.toArray.mockResolvedValue(mockUsers);
      
      await getAllUsers(req, res);
      
      expect(mockCollection.find).toHaveBeenCalledWith({});
      expect(mockCollection.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        count: 2,
        users: mockUsers
      });
    });
    
    it('should return empty array when no users', async () => {
      mockCollection.toArray.mockResolvedValue([]);
      
      await getAllUsers(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        count: 0,
        users: []
      });
    });
  });
  
  // TEST: getUserById
  describe('getUserById', () => {
    it('should get user by ID', async () => {
      req.params.id = '707f1f77bcf86cd799439031';
      
      const mockUser = {
        _id: new ObjectId('707f1f77bcf86cd799439031'),
        username: 'johndoe',
        role: 'admin'
      };
      
      mockCollection.findOne.mockResolvedValue(mockUser);
      
      await getUserById(req, res);
      
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });
    
    it('should return 404 when user not found', async () => {
      req.params.id = '707f1f77bcf86cd799439031';
      mockCollection.findOne.mockResolvedValue(null);
      
      await getUserById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });
  
  // TEST: updateUser
  describe('updateUser', () => {
    it('should update user profile', async () => {
      req.params.id = '707f1f77bcf86cd799439031';
      req.body = {
        role: 'admin',
        profile: {
          displayName: 'Updated Name'
        }
      };
      
      const mockUpdatedUser = {
        _id: new ObjectId('707f1f77bcf86cd799439031'),
        username: 'johndoe',
        role: 'admin',
        profile: {
          displayName: 'Updated Name'
        }
      };
      
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
      mockCollection.findOne.mockResolvedValue(mockUpdatedUser);  
      
      await updateUser(req, res);
      
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        expect.objectContaining({
          $set: expect.objectContaining({
            role: 'admin',
            updatedAt: expect.any(Date)
          })
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User updated successfully',
          user: mockUpdatedUser
        })
      );
    });
    
    it('should return 404 when updating non-existent user', async () => {
      req.params.id = '707f1f77bcf86cd799439031';
      req.body = { role: 'admin' };
      
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 0 });
      
      await updateUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });
  
  // TEST: deleteUser
  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      req.params.id = '707f1f77bcf86cd799439031';
      
      const mockUser = {
        _id: new ObjectId('707f1f77bcf86cd799439031'),
        username: 'johndoe'
      };
      
      mockCollection.findOne.mockResolvedValue(mockUser);
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      
      await deleteUser(req, res);
      
      expect(mockCollection.deleteOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User deleted successfully'
        })
      );
    });
    
    it('should return 404 when deleting non-existent user', async () => {
      req.params.id = '707f1f77bcf86cd799439031';
      mockCollection.findOne.mockResolvedValue(null);
      
      await deleteUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });
});