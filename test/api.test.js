const assert = require('assert');
const {expect} = require('chai');
const should = require('chai').should();
const sinon = require('sinon');
const {XMLHttpRequest} = require('xmlhttprequest');

/**
 * @param {string} sort .
 * @param {function} callback .
 * @return {undefined} .
 */
function getIndexAPI(sort, callback) {
	const xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			// console.log(JSON.parse(this.responseText));
			callback(null, JSON.parse(this.responseText));
		} else {
			callback(xhr.status);
		}
	};
	xhr.open('GET', `https://wheatxstone.com/api/index?sort=${sort}&tag=null`, true);
	xhr.send();
}

describe('Test Index API', function() {
	beforeEach(function(done) {
		this.xhr = sinon.useFakeXMLHttpRequest();
		this.requests = [];
		this.xhr.onCreate = function(xhr) {
			this.requests.push(xhr);
		}.bind(this);
		done();
	});
	afterEach(function(done) {
		this.xhr.restore();
		done();
	});
	// Tests etc. go here
	it('should parse fetched data as JSON', function(done) {
		getIndexAPI('date', function(err, result) {
			console.log(result);
			done();
			// result.should.deep.equal(data);
		});
		// this.requests[0].respond(200, {'Content-Type': 'text/json'}, dataJson);
	});
});


