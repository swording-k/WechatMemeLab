function writeBytes(fs,filePath,bytes){
 return new Promise((resolve,reject)=>fs.writeFile({filePath,data:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),success:resolve,fail:reject}));
}
module.exports={writeBytes};
