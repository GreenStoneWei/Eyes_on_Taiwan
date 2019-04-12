const mysql = require("mysql");
const credential = require("../util/credentials.js");

const conPool = mysql.createPool({
    connectionLimit: 10,
    host:"localhost",
	user:"root",
	password: credential.mysqlPWD,
	database:"newscraping"
	// debug: true
})

module.exports = {
	core: mysql,
    conPool: conPool
};