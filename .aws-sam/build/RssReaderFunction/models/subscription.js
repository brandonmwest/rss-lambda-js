
const { Model } = require('objection');

class Subscription extends Model {
    // Table name is the only required property.
    static get tableName() {
        return 'subscriptions';
    }

    static get relationMappings() {
        return {
            items: {
                relation: Model.HasManyRelation,
                modelClass: __dirname + '/item',
                join: {
                    from: 'subscriptions.id',
                    to: 'items.subscriptionId'
                }
            }
        }        
    }
}

module.exports = Subscription;