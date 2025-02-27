const accountRouter=require('./account')
const mainRouter=require('./main')

function route(app){
    app.use('/account', accountRouter);
    app.get('/',mainRouter);

}

module.exports = route