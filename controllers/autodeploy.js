const express = require('express');
const router  = express.Router();
const execFile = require('child_process').execFile;

router.post('/news/auto/payload', (req,res) => {
    execFile('/home/ec2-user/cicdbash/newscraping.sh', (error, stdout, stderr) => {
        if (error){
            res.end();
            throw error;
        }
        res.end();
    })
})

module.exports = router;