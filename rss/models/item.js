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
            },
            tags: {
                relation: Model.ManyToManyRelation,
                modelClass: __dirname + '/tag',
                join: {
                    from: 'items.id',
                    through: {
                        from: 'itemTags.itemId',
                        to: 'itemTags.tagId'
                    },
                    to: 'tags.id'
                }
            }
        }
    }
}

module.exports = Item;