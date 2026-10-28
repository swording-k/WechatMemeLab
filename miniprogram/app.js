const account=require('./lib/account-api');
App({globalData:{account:null,accountError:''},onLaunch(){account.request('me').then(info=>{this.globalData.account=info.account;this.globalData.developer=info.developer===true;}).catch(error=>{this.globalData.accountError=error.message;});}});
