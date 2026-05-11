const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

let cachedSecrets = null;

async function getSecrets() {
  // Prevent repeated calls during warm Lambda invocations
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || "ap-south-1",
  });

  const command = new GetSecretValueCommand({
    SecretId: "payment/dev/app",
  });

  const response = await client.send(command);

  const secrets = JSON.parse(response.SecretString);

  // Populate process.env
  Object.keys(secrets).forEach((key) => {
    process.env[key] = secrets[key];
  });

  cachedSecrets = secrets;

  return secrets;
}

module.exports = {
  getSecrets,
};