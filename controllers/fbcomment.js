const express = require('express');
const router  = express.Router();
const myLib   = require('../util/config.js');
const mysql   = require('../util/mysql.js');
const bodyParser = require('body-parser');

router.post('/webhook/fb/comment', (req,res) => {
    let url = req.originalUrl;
    console.log(url);
    console.log(req.body);
    res.send(req.query['hub.challenge']);
})

module.exports = router;