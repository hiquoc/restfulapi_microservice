const accountRouter=require('./account')
const productRouter=require('./product')
const adminRouter=require('./admin')
const mainRouter=require('./main')

function route(app){
    app.use('/account', accountRouter);
    app.use('/product', productRouter);
    app.use('/admin', adminRouter);
    app.use('/',mainRouter);

}

module.exports = route