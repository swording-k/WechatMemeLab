import test from 'node:test';import assert from 'node:assert/strict';
import {retryTransaction} from '../cloudfunctions/meme-motion/transaction.mjs';
test('transient database contention retries only the transaction, never hides a business error',async()=>{let calls=0;assert.equal(await retryTransaction(async()=>{if(++calls<3)throw Error('[ResourceUnavailable.TransactionBusy]');return 42;},async()=>{}),42);assert.equal(calls,3);calls=0;await assert.rejects(retryTransaction(async()=>{calls++;throw Error('点数不足');},async()=>{}),/点数不足/);assert.equal(calls,1);});
