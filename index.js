const server = require('./src/config/server').server
const port = process.env.PORT || 8080
const router = require('./src/routes/router')

server.listen(port, (router) => {
	console.log('Server started at port ' + port)
})