import createCrudController from "./crudController.js";
import model from "../models/supplier.js";
import { supplierSerializer } from "./serializers.js";

export default createCrudController({ model, entity: "Постачальника", serialize: supplierSerializer });
