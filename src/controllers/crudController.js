import { matchedData } from "express-validator";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parsePagination, buildPagination } from "../utils/pagination.js";
import { publishEvent } from "../services/realtime.js";
import cache from "../utils/cache.js";

// Фабрика контролерів для простих сутностей. Контролер не знає про Prisma -
// він лише приймає запит, викликає модель і формує HTTP-відповідь.
//
// Опції:
//   events  - трансляція змін у реальному часі: publishEvent(room, "<name>:created|updated|deleted")
//   cache   - кешування списку (TTL 60с) з інвалідацією префікса при кожній зміні
const createCrudController = ({ model, entity, serialize = (item) => item, events, cache: cacheable = false }) => {
  const listCacheKey = (params) => `${entity}:list:${JSON.stringify(params)}`;

  const broadcast = (action, item) => {
    if (events) publishEvent(events.room, `${events.name}:${action}`, serialize(item));
  };

  const invalidateCache = () => {
    if (cacheable) cache.delPrefix(`${entity}:list`);
  };

  return {
    getAll: asyncHandler(async (req, res) => {
      const { search } = matchedData(req, { locations: ["query"] });
      const { page, limit, skip } = parsePagination(req.query);

      const fetchPage = async () => {
        const [items, total] = await Promise.all([
          model.findMany({ search, skip, take: limit }),
          model.count({ search }),
        ]);
        return { data: items.map(serialize), pagination: buildPagination(page, limit, total) };
      };

      // Кешуємо лише звичайні списки (без пошуку): пошук рідко повторюється
      const result = cacheable && !search
        ? await cache.wrap(listCacheKey({ page, limit }), 60, fetchPage)
        : await fetchPage();

      res.json(result);
    }),

    getById: asyncHandler(async (req, res) => {
      const item = await model.findById(req.params.id);
      if (!item) throw new ApiError(404, `${entity} не знайдено`);
      res.json(serialize(item));
    }),

    create: asyncHandler(async (req, res) => {
      // matchedData повертає лише поля, що пройшли валідацію (захист від зайвих полів)
      const item = await model.create(matchedData(req, { locations: ["body"] }));
      invalidateCache();
      broadcast("created", item);
      res.status(201).json(serialize(item));
    }),

    update: asyncHandler(async (req, res) => {
      const item = await model.update(req.params.id, matchedData(req, { locations: ["body"] }));
      invalidateCache();
      broadcast("updated", item);
      res.json(serialize(item));
    }),

    remove: asyncHandler(async (req, res) => {
      await model.remove(req.params.id);
      invalidateCache();
      if (events) publishEvent(events.room, `${events.name}:deleted`, { id: Number(req.params.id) });
      res.status(204).send();
    }),
  };
};

export default createCrudController;
