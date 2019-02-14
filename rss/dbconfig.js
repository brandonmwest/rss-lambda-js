const AWS = require('aws-sdk');
const util = require('util');
const secretName = process.env.SECRET_NAME;
const client = new AWS.SecretsManager();
client.getSecretValue = util.promisify(client.getSecretValue);

//this is an immediately invoked async function that is exported
//example usage inside an async function (like lambda event handler)
//const dbconfig = await require('./dbconfig');

module.exports = (async () => {
  let data;

  try {
    data = await client.getSecretValue({
      SecretId: secretName
    });
  } catch (err) {
    console.error(err);
    if (err.code === 'ResourceNotFoundException')
      throw ("The requested secret " + secretName + " was not found");
    else if (err.code === 'InvalidRequestException')
      throw ("The request was invalid due to: " + err.message);
    else if (err.code === 'InvalidParameterException')
      throw ("The request had invalid params: " + err.message);
    else
      throw (err.message);
  }

  secret = data.SecretString;

  connection = {
    database: 'rss',
    host: JSON.parse(secret).host,
    user: JSON.parse(secret).username,
    password: JSON.parse(secret).password
  }

  return connection;
})();