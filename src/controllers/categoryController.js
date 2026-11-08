import createCrudController from "./crudController.js";
import model from "../models/category.js";
import { categorySerializer } from "./serializers.js";

// Зміни категорій транслюються в кімнату "categories" та інвалідують кеш списку
export default createCrudController({
  model,
  entity: "Категорію",
  serialize: categorySerializer,
  events: { room: "categories", name: "category" },
  cache: true,
});
