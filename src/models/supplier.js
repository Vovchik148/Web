import createBaseModel from "./baseModel.js";

export default createBaseModel("supplier", {
  include: { _count: { select: { products: true } } },
  orderBy: { name: "asc" },
  searchFields: ["name", "email", "phone"],
});
