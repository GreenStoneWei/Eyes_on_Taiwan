const supertest = require('supertest');
const {expect} = require('chai');
const api = supertest('https://wheatxstone.com/api');
const assert = require('assert');
const should = require('chai').should();

describe('GET /index API', function() {
	it('responds with json and sort by date', function(done) {
		api.get('/index?sort=date&tag=null')
			.expect(200)
			.end((err, res) => {
				if (err) {
					done(err);
				}
				expect(res.text).to.be.a('string');
				const response = JSON.parse(res.text);
				const apiData = response.data;
				const num1 = Math.ceil(Math.random()*9);
				const num2 = Math.ceil(Math.random()*9);
				if (num1> num2) {
					assert.ok(apiData[num2].unixtime > apiData[num1].unixtime);
				} else {
					assert.ok(apiData[num1].unixtime > apiData[num2].unixtime);
				}
				expect(response).to.have.property('totalPage');
				expect(response).to.have.property('data');
				expect(apiData).to.have.lengthOf(9);
				done();
			});
	});
	it('should sorted by viewed count', function(done) {
		api.get('/index?sort=most_viewed&tag=null')
			.expect(200)
			.end((err, res) => {
				if (err) {
					done(err);
				}
				const response = JSON.parse(res.text);
				const apiData = response.data;
				const num1 = Math.ceil(Math.random()*9);
				const num2 = Math.ceil(Math.random()*9);
				if (num1> num2) {
					assert.ok(apiData[num2].viewed_count > apiData[num1].viewed_count);
				} else {
					assert.ok(apiData[num1].viewed_count > apiData[num2].viewed_count);
				}
				done();
			});
	});
});
