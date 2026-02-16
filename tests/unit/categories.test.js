// tests/unit/categories.test.js

const { ObjectId } = require('mongodb');

// Mock the database module
const mockGetDatabase = jest.fn();
jest.mock('../../data/database', () => ({
  getDatabase: () => mockGetDatabase()
}));

// Import controller AFTER mocking
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} = require('../../controllers/categoriesController');

describe('Categories Controller - Unit Tests', () => {
  let req, res, mockCollection;
  
  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
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
      toArray: jest.fn()
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
  
  // TEST: createCategory
  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      req.body = {
        name: 'Electronics',
        description: 'Electronic devices',
        slug: 'electronics',
        isActive: true
      };
      
      const mockInsertResult = {
        insertedId: new ObjectId('507f1f77bcf86cd799439011')
      };
      
      mockCollection.insertOne.mockResolvedValue(mockInsertResult);
      
      await createCategory(req, res);
      
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Electronics',
          slug: 'electronics'
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Category created successfully',
          categoryId: mockInsertResult.insertedId
        })
      );
    });
    
    it('should auto-generate slug from name if not provided', async () => {
      req.body = {
        name: 'Home & Kitchen'
      };
      
      mockCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });
      
      await createCategory(req, res);
      
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'home-&-kitchen'
        })
      );
    });
    
    it('should create category with parent category', async () => {
      req.body = {
        name: 'Smartphones',
        parentCategoryId: '507f1f77bcf86cd799439011'
      };
      
      mockCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });
      
      await createCategory(req, res);
      
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Smartphones',
          parentCategoryId: expect.any(ObjectId)
        })
      );
    });
    
    it('should handle errors', async () => {
      req.body = { name: 'Test' };
      mockCollection.insertOne.mockRejectedValue(new Error('DB error'));
      
      await createCategory(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
  
  // TEST: getAllCategories
  describe('getAllCategories', () => {
    it('should get all categories successfully', async () => {
      const mockCategories = [
        { _id: new ObjectId(), name: 'Electronics' },
        { _id: new ObjectId(), name: 'Home & Kitchen' }
      ];
      
      mockCollection.toArray.mockResolvedValue(mockCategories);
      
      await getAllCategories(req, res);
      
      expect(mockCollection.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        count: 2,
        categories: mockCategories
      });
    });
    
    it('should return empty array when no categories', async () => {
      mockCollection.toArray.mockResolvedValue([]);
      
      await getAllCategories(req, res);
      
      expect(res.json).toHaveBeenCalledWith({
        count: 0,
        categories: []
      });
    });
    
    it('should handle errors', async () => {
      mockCollection.toArray.mockRejectedValue(new Error('DB error'));
      
      await getAllCategories(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
  
  // TEST: getCategoryById
  describe('getCategoryById', () => {
    it('should get category by ID with all related data', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      
      const mockCategory = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        name: 'Smartphones',
        parentCategoryId: new ObjectId('507f1f77bcf86cd799439012')
      };
      
      const mockParentCategory = {
        _id: new ObjectId('507f1f77bcf86cd799439012'),
        name: 'Electronics',
        slug: 'electronics'
      };
      
      const mockSubcategories = [
        { _id: new ObjectId(), name: 'iPhone' }
      ];
      
      mockCollection.findOne
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(mockParentCategory);
      
      mockCollection.toArray.mockResolvedValue(mockSubcategories);
      mockCollection.countDocuments.mockResolvedValue(5);
      
      await getCategoryById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Smartphones',
          parentCategory: expect.objectContaining({
            name: 'Electronics'
          }),
          subcategories: mockSubcategories,
          productCount: 5
        })
      );
    });
    
    it('should return 404 when category not found', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      mockCollection.findOne.mockResolvedValue(null);
      
      await getCategoryById(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });
    
    it('should handle category without parent', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      
      const mockCategory = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        name: 'Electronics',
        parentCategoryId: null
      };
      
      mockCollection.findOne.mockResolvedValue(mockCategory);
      mockCollection.toArray.mockResolvedValue([]);
      mockCollection.countDocuments.mockResolvedValue(10);
      
      await getCategoryById(req, res);
      
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          parentCategory: null
        })
      );
    });
  });
  
  // TEST: updateCategory
  describe('updateCategory', () => {
    it('should update category successfully', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      req.body = {
        name: 'Updated Electronics',
        description: 'New description'
      };
      
      const mockUpdatedCategory = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        name: 'Updated Electronics',
        description: 'New description'
      };
      
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1 });
      mockCollection.findOne.mockResolvedValue(mockUpdatedCategory);
      
      await updateCategory(req, res);
      
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        { $set: expect.objectContaining({
          name: 'Updated Electronics',
          updatedAt: expect.any(Date)
        })}
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Category updated successfully',
          category: mockUpdatedCategory
        })
      );
    });
    
    it('should return 404 when updating non-existent category', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      req.body = { name: 'Updated' };
      
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 0 });
      
      await updateCategory(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });
  });
  
  // TEST: deleteCategory
  describe('deleteCategory', () => {
    it('should hard delete category with no subcategories or products', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      
      const mockCategory = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        name: 'Test Category'
      };
      
      mockCollection.findOne.mockResolvedValue(mockCategory);
      mockCollection.countDocuments
        .mockResolvedValueOnce(0)  // No subcategories
        .mockResolvedValueOnce(0); // No products
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      
      await deleteCategory(req, res);
      
      expect(mockCollection.deleteOne).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Category deleted successfully'
        })
      );
    });
    
    it('should prevent deletion when category has subcategories', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      
      mockCollection.findOne.mockResolvedValue({
        _id: new ObjectId('507f1f77bcf86cd799439011')
      });
      mockCollection.countDocuments.mockResolvedValue(3); // Has subcategories
      
      await deleteCategory(req, res);
      
      expect(mockCollection.deleteOne).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot delete category with subcategories. Delete subcategories first.'
      });
    });
    
    it('should soft delete when category has products', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      
      mockCollection.findOne.mockResolvedValue({
        _id: new ObjectId('507f1f77bcf86cd799439011')
      });
      mockCollection.countDocuments
        .mockResolvedValueOnce(0)  // No subcategories
        .mockResolvedValueOnce(5); // Has products
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      
      await deleteCategory(req, res);
      
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            isActive: false
          })
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Category marked as inactive (contains products)'
        })
      );
    });
    
    it('should return 404 when deleting non-existent category', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      mockCollection.findOne.mockResolvedValue(null);
      
      await deleteCategory(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
    });
  });
});