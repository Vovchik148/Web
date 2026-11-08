import createCrudController from "./crudController.js";
import model from "../models/supplier.js";
import { supplierSerializer } from "./serializers.js";

// Зміни постачальників транслюються в кімнату "suppliers" та інвалідують кеш списку
export default createCrudController({
  model,
  entity: "Постачальника",
  serialize: supplierSerializer,
  events: { room: "suppliers", name: "supplier" },
  cache: true,
});
