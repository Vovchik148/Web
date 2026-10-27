const createBaseModel = require("./baseModel");

module.exports = createBaseModel("supplier", {
  include: { _count: { select: { products: true } } },
  orderBy: { name: "asc" },
  searchFields: ["name", "email", "phone"],
});
