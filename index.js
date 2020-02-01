/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/**
 * @fileoverview This file supports the codelab for Google Pay:
 * Build a Fast Checkout Experience on the Web with Google Pay, representing
 * a sample t-shirt store that suggests a new t-shirt on every load and uses
 * Google Pay as a means of payment.
 *
 * Note: This example uses minimal external resources (no jquery, react,
 * polymer, etc).
 */

const allowedNetworks = ["VISA", "MASTERCARD"];
const allowedAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"];

const baseCardPaymentMethod = {
  type: "CARD",
  parameters: {
    allowedCardNetworks: allowedNetworks,
    allowedAuthMethods: allowedAuthMethods
  }
};

const googlePayBaseConfiguration = {
  apiVersion: 2,
  apiVersionMinor: 0,
  allowedPaymentMethods: [baseCardPaymentMethod]
};

// Information about the merchant.
const merchantInfo = {
  merchantName: "Fake Merchant",
  merchantId: "01234567890123456789"
  // merchantName: "Rouslan Solomakhin", merchantId: "00184145120947117657"
};

const shippingOptionParameters = {
  shippingOptions: [
    {
      id: "shipping-001",
      label: "$0.01: Standard shipping",
      description: "Delivered on May 15."
    },
    {
      id: "shipping-002",
      label: "$0.05: Expedited shipping",
      description: "Delivered on May 12."
    },
    {
      id: "shipping-003",
      label: "$0.50: Express shipping",
      description: "Delivered tomorrow."
    }
  ]
};

// Shipping surcharges mapped to the IDs above.
const shippingSurcharges = {
  "shipping-001": 0.01,
  "shipping-002": 0.05,
  "shipping-003": 0.5
};

const transactionInfo = {
  totalPriceStatus: "ESTIMATED",
  totalPrice: "1.00",
  currencyCode: "USD"
};

/**
 * Holds the Google Pay client used to call the different methods available
 * through the API.
 * @type {PaymentsClient}
 * @private
 */
let googlePayClient;

// Called for dynamic update.
function paymentDataCallback(callbackPayload) {
  // console.log("paymentDataCallback:", callbackPayload);
  const selectedShippingOptionId = callbackPayload.shippingOptionData.id;
  const shippingSurcharge = shippingSurcharges[selectedShippingOptionId];
  const priceWithSurcharges =
    Number(transactionInfo.totalPrice) + shippingSurcharge;

  return {
    newTransactionInfo: {
      totalPriceStatus: "FINAL",
      totalPrice: priceWithSurcharges.toFixed(2),
      totalPriceLabel: "Total",
      currencyCode: "USD",
      displayItems: [
        {
          label: "Subtotal",
          type: "SUBTOTAL",
          price: priceWithSurcharges.toFixed(2)
        },
        {
          label: "Shipping",
          type: "LINE_ITEM",
          price: shippingSurcharge.toFixed(2),
          status: "FINAL"
        }
      ]
    }
  };
}

function paymentAuthorizedCallback(callbackPayload) {
  console.log("paymentAuthorizedCallback:");
  console.log(callbackPayload);
  return {
    transactionState: "SUCCESS"
  };
}

function getPaymentDataNoTransaction(dynamic_update = true) {
  // TODO: Launch the payments sheet using the loadPaymentData method in the payments client:
  // 1. Update the card created before to include a tokenization spec and other parameters.
  const tokenizationSpecification = {
    type: "PAYMENT_GATEWAY",
    parameters: {
      gateway: "example",
      gatewayMerchantId: "gatewayMerchantId"
    }
  };
  const cardPaymentMethod = {
    type: "CARD",
    tokenizationSpecification: tokenizationSpecification,
    parameters: {
      allowedCardNetworks: allowedNetworks,
      allowedAuthMethods: allowedAuthMethods,
      billingAddressRequired: true,
      billingAddressParameters: {
        format: "FULL",
        phoneNumberRequired: false
      }
    }
  };

  const paymentDataRequest = Object.assign({}, googlePayBaseConfiguration, {
    allowedPaymentMethods: [cardPaymentMethod],
    transactionInfo: {
      totalPriceStatus: "NOT_CURRENTLY_KNOWN",
      currencyCode: "USD"
    },
    merchantInfo: merchantInfo
  });

  if (!dynamic_update) return paymentDataRequest;

  // Place inside of onGooglePaymentsButtonClicked()
  paymentDataRequest.shippingAddressRequired = true;
  paymentDataRequest.shippingOptionRequired = true;
  paymentDataRequest.callbackIntents = [
    "SHIPPING_OPTION",
    "SHIPPING_ADDRESS",
    "PAYMENT_AUTHORIZATION"
  ];
  paymentDataRequest.shippingOptionParameters = shippingOptionParameters;

  return paymentDataRequest;
}

/**
 * Defines and handles the main operations related to the integration of
 * Google Pay. This function is executed when the Google Pay library script has
 * finished loading.
 */
function onGooglePayLoaded() {
  // Native Payment Request, not through pay.js.
  mayEnablePRButton(document.getElementById("buy-now-pr"));

  // GPay button and Popup.

  // Initialize the client and determine readiness to pay with Google Pay:
  // 1. Instantiate the client using the 'TEST' environment.
  googlePayClient = new google.payments.api.PaymentsClient({
    paymentDataCallbacks: {
      onPaymentDataChanged: paymentDataCallback,
      onPaymentAuthorized: paymentAuthorizedCallback
    },
    environment: "TEST"
  });
  // 2. Call the isReadyToPay method passing in the necessary configuration.
  googlePayClient
    .isReadyToPay(googlePayBaseConfiguration)
    .then(response => {
      if (response.result) {
        createAndAddButton();
        googlePayClient.prefetchPaymentData(getPaymentDataNoTransaction());
      } else {
        alert("Unable to pay with GPay");
      }
    })
    .catch(e => console.log(e));
}

/**
 * Handles the creation of the button to pay with Google Pay.
 * Once created, this button is appended to the DOM, under the element
 * 'buy-now'.
 */
function createAndAddButton() {
  // TODO: Create Google Pay button andd add it to the DOM.
  const googlePayButton = googlePayClient.createButton({
    onClick: onGooglePaymentsButtonClicked
  });
  // TODO: Add the button to the DOM
  googlePayButton.setAttribute("id", "google-pay-button");
  document.getElementById("buy-now").appendChild(googlePayButton);
}

/**
 * Handles the click of the button to pay with Google Pay. Takes
 * care of defining the payment data request to be used in order to load
 * the payments methods available to the user.
 */
function onGooglePaymentsButtonClicked() {
  const paymentDataRequest = Object.assign(getPaymentDataNoTransaction(true), {
    transactionInfo
  });
  console.log(paymentDataRequest);
  // 4. Call loadPaymentData.
  googlePayClient
    .loadPaymentData(paymentDataRequest)
    .then(function(paymentData) {
      processPayment(paymentData);
    })
    .catch(function(err) {
      // Log error: { statusCode: CANCELED || DEVELOPER_ERROR }
      console.log(err);
    });
}

function mayEnablePRButton(ele) {
  const request = new PaymentRequest(getPRMethods(), getPRDetails(), {
    requestShipping: true
  });
  request
    .hasEnrolledInstrument()
    .then(cardOnFile => (ele.innerHTML = `PaymentRequest Card ${cardOnFile}`));
  ele.addEventListener("click", onBuyWithPRClicked);
}

/**
 * Handles the click of the button to pay with Google Pay with PR.
 */
function getPRMethods() {
  const basicCard = {
    supportedMethods: "basic-card",
    data: {
      supportedNetworks: allowedNetworks,
      supportedTypes: ["credit", "debit", "prepaid"]
    }
  };

  const gPay = {
    supportedMethods: "https://google.com/pay",
    data: Object.assign(getPaymentDataNoTransaction(false), {
      transactionInfo
    })
  };
  return [basicCard, gPay];
}
function getPRDetails() {
  // Shipping Options format is different between pay.js and Payment Request.
  const shippingOptions = shippingOptionParameters.shippingOptions.map(x => {
    return {
      amount: {
        value: shippingSurcharges[x.id],
        currency: "USD"
      },
      id: x.id,
      label: x.label,
      selected: false
    };
  });
  shippingOptions[1].selected = true;
  const details = {
    total: {
      label: "Totals",
      amount: {
        currency: "USD",
        value: "2.00"
      }
    },
    shippingOptions
  };
  // console.log(JSON.stringify(details, null, 2));
  return details;
}
function onBuyWithPRClicked() {
  const request = new PaymentRequest(getPRMethods(), getPRDetails(), {
    requestShipping: true
  });
  request.onshippingoptionchange = ev => {
    console.log(ev);
    const newDetails = getPRDetails();
    let nValue = Number(newDetails.total.amount.value);
    nValue += Number(shippingSurcharges[ev.target.shippingOption]);
    newDetails.total.amount.value = nValue.toFixed(2);
    newDetails.shippingOptions.forEach(x => {
      x.selected = x.id == ev.target.shippingOption;
    });
    ev.updateWith(newDetails);
  };
  request.onshippingaddresschange = evt => evt.updateWith(getPRDetails());
  try {
    if (request.canMakePayment) {
      request
        .canMakePayment()
        .then(function(result) {
          console.log(result ? "Can make payment" : "Cannot make payment");
          // console.dir(gPay);
          request.show();
        })
        .catch(function(err) {
          console.log(err);
        });
    }
  } catch (e) {
    console.log("Developer mistake: '" + e + "'");
  }
}

function processPayment(paymentData) {
  // TODO: Send a POST request to your processor with the payload
  // https://us-central1-devrel-payments.cloudfunctions.net/google-pay-server
  // Sorry, this is out-of-scope for this codelab.
  console.log("After loadPaymentData: %s", paymentData);

  return new Promise(function(resolve, reject) {
    // @todo pass payment token to your gateway to process payment
    const paymentToken = paymentData.paymentMethodData.tokenizationData.token;
    console.log("mock send token " + paymentToken + " to payment processor");
    setTimeout(function() {
      console.log("mock response from processor");
      alert("done");
      resolve({});
    }, 800);
  });
}

function sendPayloadToProcessor(googlePayPayload) {
  // Send a POST request to your processor with the payload
  // https://us-central1-devrel-payments.cloudfunctions.net/google-pay-server
}
