const AWS = require('aws-sdk');
const util = require('util');

// this is an immediately invoked async function that is exported
// example usage inside an async function (like lambda event handler):
//    const dbconfig = await require('./dbconfig');

const secretName = process.env.SECRET_NAME;
const client = new AWS.SecretsManager();
client.getSecretValue = util.promisify(client.getSecretValue);

module.exports = (async () => {
    let data;
    try {
        data = await client.getSecretValue({
        SecretId: secretName
        });
    } catch (err) {
        console.error(err);
        throw (err.message);
    }

    secret = data.SecretString;

    connections = {
        development: {
            client: 'sqlite3',
            connection: {
                filename: 'development.db'
            }
        },
        production: {
            client: 'mysql',
            connection: {
                database: 'rss',
                host: JSON.parse(secret).host,
                user: JSON.parse(secret).username,
                password: JSON.parse(secret).password
            }
        }
    }
    return connections;
})();