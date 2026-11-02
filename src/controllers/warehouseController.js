import createCrudController from "./crudController.js";
import model from "../models/warehouse.js";
import { warehouseSerializer } from "./serializers.js";

export default createCrudController({ model, entity: "Склад", serialize: warehouseSerializer });
