import createCrudController from "./crudController.js";
import model from "../models/warehouse.js";
import { warehouseSerializer } from "./serializers.js";

// Зміни складів транслюються в кімнату "warehouses" та інвалідують кеш списку
export default createCrudController({
  model,
  entity: "Склад",
  serialize: warehouseSerializer,
  events: { room: "warehouses", name: "warehouse" },
  cache: true,
});
