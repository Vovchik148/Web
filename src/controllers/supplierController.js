const createCrudController = require("./crudController");
const model = require("../models/supplier");
const { supplierSerializer } = require("./serializers");

module.exports = createCrudController({ model, entity: "Постачальника", serialize: supplierSerializer });
