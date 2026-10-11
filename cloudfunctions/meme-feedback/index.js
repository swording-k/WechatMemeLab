const {createHandler}=require('./server.cjs');const {gateway}=require('./gateway.cjs');const store=require('./store.cjs');
exports.main=gateway(createHandler(store));
