const createCrudController = require("./crudController");
const model = require("../models/warehouse");
const { warehouseSerializer } = require("./serializers");

module.exports = createCrudController({ model, entity: "Склад", serialize: warehouseSerializer });
