const mysql = require('mysql');
const credential = require('../util/credentials.js');

const conPool = mysql.createPool({
	connectionLimit: 20,
	host: 'localhost',
	user: credential.mysql.user,
	password: credential.mysql.password,
	database: 'newscraping',
	// debug: true
});

module.exports = {
	core: mysql,
	conPool: conPool,
};
