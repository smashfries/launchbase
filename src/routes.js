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
    // change route
    fastify.get('/home', (req, rep) => {
        return rep.view('home.hbs')
    })
    fastify.get('/backstage/profile', (req, rep) => {
        return rep.sendFile('backstage/profile.html')
    })
}

module.exports = routes