const Razorpay = require("razorpay");
const { getSecrets } = require("../config/secrets");

let razorpayInstance = null;

async function getRazorpayInstance() {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  const secrets = await getSecrets();

  console.log(
    "RAZORPAY_KEY_ID:",
    secrets
  );

  razorpayInstance = new Razorpay({
    key_id: secrets.RAZORPAY_KEY_ID,
    key_secret: secrets.RAZORPAY_KEY_SECRET,
  });

  console.log("New Razorpay instance created");
  
  return razorpayInstance;
}

module.exports = { getRazorpayInstance };