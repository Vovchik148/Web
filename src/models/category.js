import createBaseModel from "./baseModel.js";

export default createBaseModel("category", {
  include: { _count: { select: { products: true } } },
  orderBy: { name: "asc" },
  searchFields: ["name", "description"],
});
