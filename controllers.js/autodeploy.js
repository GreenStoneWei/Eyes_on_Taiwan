const execFile = require('child_process').execFile;

app.post('/payload', (req,res) => {
	let now = new Date().toLocaleString('en-US',{timeZone: 'Asia/Taipei'});
    execFile('/home/ec2-user/cicdbash/midterm.sh', (error, stdout, stderr) => {
        


    })
})