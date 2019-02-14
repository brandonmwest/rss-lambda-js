const { Model } = require('objection');

class Item extends Model {
    // Table name is the only required property.
    static get tableName() {
        return 'items';
    }
}

module.exports = Item;