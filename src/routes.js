async function routes (fastify, options) {
    fastify.get('/', (req, rep) => {
        return rep.sendFile('index.html')
    })
    fastify.get('/login', (req, rep) => {
        return rep.sendFile('login.html')
    })
    fastify.get('/signup', (req, rep) => {
        return rep.sendFile('signup.html')
    })
    fastify.get('/home', (req, rep) => {http://localhost:5000/homw
        return rep.view('home.hbs')
    })
}

module.exports = routes