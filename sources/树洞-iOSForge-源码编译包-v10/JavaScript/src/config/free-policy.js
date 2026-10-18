// New maintenance code. Module 9000 is outside the recovered factory ID set.
__d(9000, function (global, require, module, exports) {
  "use strict";
  module.exports = {
    freeEdition: true,
    purchasesEnabled: false,
    localSnapPreview: true,
    testStarsEnabled: true,
    testStarsGrant: 1000,
    createTestWallet: function (storage) { return require(9001)(storage); },
    allowRemoteHotUpdates: false,
    // Enforced by the server too: balances and shadow eligibility are not fabricated here.
    serverMustAllowFreeEntitlements: true,
    unavailableMessage: "当前为免费维护版本，无需购买。若服务器仍限制权益，请更新服务端免费策略。",
    notifyBackendRequired: function (apps) {
      if (apps && typeof apps.tip === "function") apps.tip(this.unavailableMessage);
      return Promise.resolve({purchasesDisabled: true, serverFreePolicyRequired: true});
    }
  };
});
