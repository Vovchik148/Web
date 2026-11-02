import createBaseModel from "./baseModel.js";

export default createBaseModel("warehouse", {
  include: { _count: { select: { stocks: true } } },
  orderBy: { name: "asc" },
  searchFields: ["name", "location"],
});
