const createCrudController = require("./crudController");
const model = require("../models/category");
const { categorySerializer } = require("./serializers");

module.exports = createCrudController({ model, entity: "Категорію", serialize: categorySerializer });
