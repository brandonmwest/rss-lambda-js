
const { Model } = require('objection');

class Subscription extends Model {
    // Table name is the only required property.
    static get tableName() {
        return 'subscriptions';
    }
}

module.exports = Subscription;