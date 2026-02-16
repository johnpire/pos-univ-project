// tests/unit/products.test.js

const { ObjectId } = require('mongodb');

// Mock the database module
const mockGetDatabase = jest.fn();
jest.mock('../../data/database', () => ({
  getDatabase: () => mockGetDatabase()
}));

// Import controller AFTER mocking
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct
} = require('../../controllers/productsController');

describe('Products Controller - Unit Tests', () => {
  let req, res, mockCollection;
  
  // Setup before each test
  beforeEach(() => {
    // Mock request object
    req = {
      body: {},
      params: {},
      query: {}
    };
    
    // Mock response object
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    // Mock database collection
    mockCollection = {
      insertOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
      toArray: jest.fn()
    };
    
    // Mock database connection
    mockGetDatabase.mockReturnValue({
      db: () => ({
        collection: () => mockCollection
      })
    });
  });
  
  // Clear mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // TEST: createProduct
  describe('createProduct', () => {
    it('should create a product successfully', async () => {
      // Arrange - Setup test data
      req.body = {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        categoryId: '507f1f77bcf86cd799439011',
        stock: 10,
        images: ['image1.jpg'],
        specifications: { color: 'red' },
        isActive: true
      };
      
      const mockInsertResult = {
        insertedId: new ObjectId('607f1f77bcf86cd799439021')
      };
      
      mockCollection.insertOne.mockResolvedValue(mockInsertResult);
      
      // Act - Call the function
      await createProduct(req, res);
      
      // Assert - Check results
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Product created successfully',
          productId: mockInsertResult.insertedId
        })
      );
    });
    
    it('should handle errors when creating product', async () => {
      // Arrange
      req.body = {
        name: 'Test Product',
        price: 99.99,
        categoryId: '507f1f77bcf86cd799439011'
      };
      
      mockCollection.insertOne.mockRejectedValue(new Error('Database error'));
      
      // Act
      await createProduct(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
  
  // TEST: getAllProducts
  describe('getAllProducts', () => {
    it('should get all products successfully', async () => {
      // Arrange
      const mockProducts = [
        {
          _id: new ObjectId('607f1f77bcf86cd799439021'),
          name: 'Product 1',
          price: 99.99
        },
        {
          _id: new ObjectId('607f1f77bcf86cd799439022'),
          name: 'Product 2',
          price: 149.99
        }
      ];
      
      mockCollection.toArray.mockResolvedValue(mockProducts);
      
      // Act
      await getAllProducts(req, res);
      
      // Assert
      expect(mockCollection.find).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        count: 2,
        products: mockProducts
      });
    });
    
    it('should filter products by category', async () => {
      // Arrange
      req.query.categoryId = '507f1f77bcf86cd799439011';
      mockCollection.toArray.mockResolvedValue([]);
      
      // Act
      await getAllProducts(req, res);
      
      // Assert
      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: expect.any(ObjectId)
        })
      );
    });
  });
  
  // TEST: getProductById
  describe('getProductById', () => {
    it('should get product by ID successfully', async () => {
      // Arrange
      req.params.id = '607f1f77bcf86cd799439021';
      
      const mockProduct = {
        _id: new ObjectId('607f1f77bcf86cd799439021'),
        name: 'Test Product',
        price: 99.99,
        categoryId: new ObjectId('507f1f77bcf86cd799439011')
      };
      
      const mockCategory = {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        name: 'Electronics',
        slug: 'electronics'
      };
      
      mockCollection.findOne
        .mockResolvedValueOnce(mockProduct)  // First call - product
        .mockResolvedValueOnce(mockCategory); // Second call - category
      
      // Act
      await getProductById(req, res);
      
      // Assert
      expect(mockCollection.findOne).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Product',
          category: {
            name: 'Electronics',
            slug: 'electronics'
          }
        })
      );
    });
    
    it('should return 404 when product not found', async () => {
      // Arrange
      req.params.id = '607f1f77bcf86cd799439021';
      mockCollection.findOne.mockResolvedValue(null);
      
      // Act
      await getProductById(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });
  });
  
  // TEST: updateProduct
  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      // Arrange
      req.params.id = '607f1f77bcf86cd799439021';
      req.body = {
        name: 'Updated Product',
        price: 149.99
      };
      
      const mockUpdateResult = { matchedCount: 1 };
      const mockUpdatedProduct = {
        _id: new ObjectId('607f1f77bcf86cd799439021'),
        name: 'Updated Product',
        price: 149.99
      };
      
      mockCollection.updateOne.mockResolvedValue(mockUpdateResult);
      mockCollection.findOne.mockResolvedValue(mockUpdatedProduct);
      
      // Act
      await updateProduct(req, res);
      
      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Product updated successfully',
          product: mockUpdatedProduct
        })
      );
    });
    
    it('should return 404 when updating non-existent product', async () => {
      // Arrange
      req.params.id = '607f1f77bcf86cd799439021';
      req.body = { name: 'Updated' };
      
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 0 });
      
      // Act
      await updateProduct(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });
  });
  
  // TEST: deleteProduct
  describe('deleteProduct', () => {
    it('should delete product when not referenced in orders', async () => {
      // Arrange
      req.params.id = '607f1f77bcf86cd799439021';
      
      const mockProduct = {
        _id: new ObjectId('607f1f77bcf86cd799439021'),
        name: 'Test Product'
      };
      
      mockCollection.findOne
        .mockResolvedValueOnce(mockProduct)  // Product exists
        .mockResolvedValueOnce(null);        // No orders reference it
      
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      
      // Act
      await deleteProduct(req, res);
      
      // Assert
      expect(mockCollection.deleteOne).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Product deleted successfully'
        })
      );
    });
    
    it('should soft delete when product is referenced in orders', async () => {
      // Arrange
      req.params.id = '607f1f77bcf86cd799439021';
      
      const mockProduct = {
        _id: new ObjectId('607f1f77bcf86cd799439021'),
        name: 'Test Product'
      };
      
      const mockOrder = {
        _id: new ObjectId(),
        items: [{ productId: new ObjectId('607f1f77bcf86cd799439021') }]
      };
      
      mockCollection.findOne
        .mockResolvedValueOnce(mockProduct)  // Product exists
        .mockResolvedValueOnce(mockOrder);   // Order references it
      
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
      
      // Act
      await deleteProduct(req, res);
      
      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            isActive: false
          })
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Product marked as inactive (referenced in orders)'
        })
      );
    });
    
    it('should return 404 when deleting non-existent product', async () => {
      // Arrange
      req.params.id = '607f1f77bcf86cd799439021';
      mockCollection.findOne.mockResolvedValue(null);
      
      // Act
      await deleteProduct(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });
  });
});