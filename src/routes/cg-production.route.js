const server = require('../config/server').server
const service = require('../model/readCGProduction').CampoGrandeProductionServices

const respond = async (req, res, next) => {
    
    service.readForOneDay(req.params.date)
        .then((responseData) => {
            res.send(200, responseData)
        })
        .catch((err) => {
            res.send(404, err)
        })
    
    next()

}

server.get('/campo-grande/producao/:date', respond)
server.head('/campo-grande/producao/:date', respond)

module.exports = { server }