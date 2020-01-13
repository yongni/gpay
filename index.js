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

console.log("index loaded");

/**
 * Google Pay API Configuration
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

/**
 * Holds the Google Pay client used to call the different methods available
 * through the API.
 * @type {PaymentsClient}
 * @private
 */
let googlePayClient;

function paymentDataCallback(callbackPayload) {
  console.log(callbackPayload);
  const selectedShippingOptionId = callbackPayload.shippingOptionData.id;
  const shippingSurcharge = shippingSurcharges[selectedShippingOptionId];
  const priceWithSurcharges = 123.45 + shippingSurcharge;

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

/**
 * Defines and handles the main operations related to the integration of
 * Google Pay. This function is executed when the Google Pay library script has
 * finished loading.
 */
function onGooglePayLoaded() {
  // Initialize the client and determine readiness to pay with Google Pay:
  // 1. Instantiate the client using the 'TEST' environment.
  googlePayClient = new google.payments.api.PaymentsClient({
    paymentDataCallbacks: {
      onPaymentDataChanged: paymentDataCallback,
      onPaymentAuthorized: paymentData => console.log(paymentData)
    },
    environment: "TEST"
  });
  // 2. Call the isReadyToPay method passing in the necessary configuration.
  googlePayClient
    .isReadyToPay(googlePayBaseConfiguration)
    .then(response => {
      if (response.result) {
        createAndAddButton();
      } else {
        alert("Unable to pay with GPay");
      }
    })
    .catch(e => console.log(e));
}

const shippingOptionParameters = {
  shippingOptions: [
    {
      id: "shipping-001",
      label: "$1.99: Standard shipping",
      description: "Delivered on May 15."
    },
    {
      id: "shipping-002",
      label: "$3.99: Expedited shipping",
      description: "Delivered on May 12."
    },
    {
      id: "shipping-003",
      label: "$10: Express shipping",
      description: "Delivered tomorrow."
    }
  ]
};

// Shipping surcharges mapped to the IDs above.
const shippingSurcharges = {
  "shipping-001": 1.99,
  "shipping-002": 3.99,
  "shipping-003": 10
};

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
      allowedCardNetworks: ["VISA", "MASTERCARD"],
      allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
      billingAddressRequired: true,
      billingAddressParameters: {
        format: "FULL",
        phoneNumberRequired: true
      }
    }
  };
  // 2. Add information about the transaction.
  const transactionInfo = {
    totalPriceStatus: "FINAL",
    totalPrice: "123.45",
    currencyCode: "USD"
  };
  // 3. Add information about the merchant.
  const merchantInfo = {
    // merchantId: '01234567890123456789', Only in PRODUCTION
    merchantName: "Example Merchant Name"
  };
  const paymentDataRequest = Object.assign(googlePayBaseConfiguration, {
    allowedPaymentMethods: [cardPaymentMethod],
    transactionInfo: transactionInfo,
    merchantInfo: merchantInfo
  });

  // Place inside of onGooglePaymentsButtonClicked()
  paymentDataRequest.shippingAddressRequired = true;
  paymentDataRequest.shippingOptionRequired = true;
  paymentDataRequest.callbackIntents = ["SHIPPING_OPTION", "SHIPPING_ADDRESS", "PAYMENT_AUTHORIZATION"];
  paymentDataRequest.shippingOptionParameters = shippingOptionParameters;

  console.log(paymentDataRequest);
  // 4. Call loadPaymentData.
  googlePayClient
    .loadPaymentData(paymentDataRequest)
    .then(function(paymentData) {
      processPayment(paymentData);
    })
    .catch(function(err) {
      // Log error: { statusCode: CANCELED || DEVELOPER_ERROR }
    });
}

function processPayment(paymentData) {
  // TODO: Send a POST request to your processor with the payload
  // https://us-central1-devrel-payments.cloudfunctions.net/google-pay-server
  // Sorry, this is out-of-scope for this codelab.
  console.log('After loadPaymentData: %s', paymentData);

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
