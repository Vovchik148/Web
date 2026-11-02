import createCrudController from "./crudController.js";
import model from "../models/category.js";
import { categorySerializer } from "./serializers.js";

export default createCrudController({ model, entity: "Категорію", serialize: categorySerializer });
