const assert = require('assert');
const recommender = require('../controllers/similar_article_finder.js');

// 測 sqrtOfSumSq
describe('The calculator of square root of sum of square of an array.', function() {
	it('should return 5', function() {
		assert.equal(recommender.sqrtOfSumSq([3, 4]), 5);
	});
	it('should return 13', function() {
		assert.equal(recommender.sqrtOfSumSq([7, 5, 1, 6, 1, 4, 6, 1, 2]), 13);
	});
	it('should return when given 0', function() {
		assert.equal(recommender.sqrtOfSumSq([0, 0, 0, 0, 0]), 0);
	});
});
// 測 cosTheta
describe('The cosine theta calculator', function() {
	it('Two of same vectiors should return 1', function() {
		assert.equal(recommender.cosTheta([1, 1, 1, 1, 1], [1, 1, 1, 1, 1]), 1);
	});
	it('should return 1 with high dimension', function() {
		assert.equal(recommender.cosTheta([1, 1, 1, 1, 1], [0.5, 0.5, 0.5, 0.5, 0.5]), 1);
	});
	it('90 degree should return 0', function() {
		assert.equal(recommender.cosTheta([1, 0, 0], [0, 1, 0]), 0);
	});
	it('cosine value should between -1 and 1', function() {
		const dimension = Math.ceil(Math.random()*10);
		const arr1 = [];
		const arr2 = [];
		for (let i=0; i< dimension; i++) {
			arr1[i] = Math.random();
			arr2[i] = Math.random();
		}
		const expectedResult = recommender.cosTheta(arr1, arr2);
		assert.ok(expectedResult >= -1 && expectedResult <=1);
	});
});
