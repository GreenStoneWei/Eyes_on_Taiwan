const mysql = require("mysql");

const conPool = mysql.createPool({
    connectionLimit: 10,
    host:"localhost",
	user:"root",
	password:"@WEIzinc6538",
	database:"newscraping"
	// debug: true
})

module.exports = {
	core: mysql,
    conPool: conPool
};