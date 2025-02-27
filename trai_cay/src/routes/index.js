const accountRouter=require('./account')
const adminRouter=require('./admin')
const mainRouter=require('./main')

function route(app){
    app.use('/account', accountRouter);
    app.use('/admin', adminRouter);
    app.get('/',mainRouter);

}

module.exports = route