const { Model } = require('objection');

class Item extends Model {
    // Table name is the only required property.
    static get tableName() {
        return 'items';
    }

    static get relationMappings() {
        return {
            subscription: {
                relation: Model.BelongsToOneRelation,
                modelClass: __dirname + '/subscription',
                join: {
                    from: 'items.subscriptionId',
                    to: 'subscriptions.id'
                }
            }
        }        
    }
}

module.exports = Item;