const { Model } = require('objection');

class Tag extends Model {
    // Table name is the only required property.
    static get tableName() {
        return 'tags';
    }
}



module.exports = Tag;