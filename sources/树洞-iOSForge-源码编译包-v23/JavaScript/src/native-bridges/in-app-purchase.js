// Compatibility adapter for the free maintenance build; never calls native billing.
__d(638, function (global, require, module, exports) {
  "use strict";
  Object.defineProperty(exports, "__esModule", {value:true});
  function list() { return Promise.resolve([]); }
  function disabled() {
    var error = new Error("In-app purchases are disabled in the free maintenance edition");
    error.code = "IAP_DISABLED_FREE_EDITION";
    return Promise.reject(error);
  }
  function listener() { return {remove:function () {}}; }
  var api = {
    initConnection:function () {return Promise.resolve(false);},
    endConnectionAndroid:function () {return Promise.resolve();},
    getProducts:list, getSubscriptions:list, getAvailablePurchases:list,
    getPurchaseHistory:list, getPendingPurchasesIOS:list,
    purchaseUpdatedListener:listener, purchaseErrorListener:listener,
    requestPurchase:disabled, requestSubscription:disabled,
    requestPurchaseWithQuantityIOS:disabled, requestPurchaseWithOfferIOS:disabled,
    buyPromotedProductIOS:disabled, finishTransaction:disabled,
    finishTransactionIOS:disabled, consumePurchaseAndroid:disabled,
    consumeAllItemsAndroid:disabled, acknowledgePurchaseAndroid:disabled,
    validateReceiptIos:disabled, validateReceiptAndroid:disabled,
    getReceiptIOS:function () {return Promise.resolve(null);},
    getPromotedProductIOS:function () {return Promise.resolve(null);},
    clearProductsIOS:function () {return Promise.resolve();},
    clearTransactionIOS:function () {return Promise.resolve();},
    IAPErrorCode:{E_IAP_NOT_AVAILABLE:"IAP_DISABLED_FREE_EDITION"},
    PurchaseStateAndroid:{UNSPECIFIED_STATE:0,PURCHASED:1,PENDING:2,0:"UNSPECIFIED_STATE",1:"PURCHASED",2:"PENDING"},
    PROMOTED_PRODUCT:"iap-promoted-product"
  };
  Object.keys(api).forEach(function (key) {exports[key]=api[key];});
  exports.default=api;
});
