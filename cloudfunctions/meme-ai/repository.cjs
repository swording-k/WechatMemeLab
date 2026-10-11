const clean=value=>{if(!value)return value;const {_id,...data}=value;return data;};
function createRepository(db,initialize){return {async transact(fn){await initialize();return db.runTransaction(tx=>fn({get:async(c,id)=>clean((await tx.collection(c).doc(id).get()).data),set:(c,id,data)=>tx.collection(c).doc(id).set(clean(data))}));}};}
module.exports={createRepository};
