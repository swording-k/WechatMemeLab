// Share only the current, successfully generated GIF. Never turn cancellation
// into a different kind of send, or claim a menu callback proves delivery.
const cancelled=error=>/cancel/i.test(error&&error.errMsg||error&&error.message||'');
const call=(wx,name,options)=>new Promise((resolve,reject)=>wx[name]({...options,success:resolve,fail:reject}));
async function shareGif(page,wx){
 const path=page.data.gifPath;
 if(!path||page.data.busy||page.sharingGif)return;
 page.sharingGif=true;
 try{
  let reason='当前微信不支持直接分享图片。';
  if(typeof wx.showShareImageMenu==='function'){
   try{await call(wx,'showShareImageMenu',{path,needShowEntrance:false});return;}
   catch(error){if(cancelled(error))return;reason='图片分享未能打开或完成。';}
  }
  const canSendFile=typeof wx.shareFileMessage==='function';
  const choice=await call(wx,'showModal',{
   title:'转发 GIF',
   content:reason+(canSendFile?'可以改为发送 GIF 文件，聊天中会以文件形式显示。也可以取消后保存到相册。':'请更新微信，或先保存到相册再发送。'),
   showCancel:canSendFile,confirmText:canSendFile?'发文件':'知道了'
  });
  if(canSendFile&&choice.confirm&&page.data.gifPath===path){
   await call(wx,'shareFileMessage',{filePath:path,fileName:'怪相馆表情.gif'});
  }
 }catch(error){if(!cancelled(error))page.error(error);}
 finally{page.sharingGif=false;}
}
module.exports={shareGif};
