import {
  GET_LIST,
  GET_MANY,
  GET_ONE,
  CREATE,
  UPDATE,
  UPDATE_MANY,
  DELETE,
  DELETE_MANY,
} from "./actions";

import FetchJson from "../utils/fetchJson";
import qs from "qs";

export default (httpClient) => {
  if (typeof httpClient === "string") {
    httpClient = new FetchJson(httpClient);
  }

  const fetchApi = async (type, resource, params = {}) => {
    switch (type) {
      case GET_LIST:
      case GET_MANY: {
        const { include, pagination, sort, filter } = params;
        let query = {};

        if (include) {
          let { embed, expand } = include;
          query = {
            _embed: embed,
            _expand: expand,
          };
        }

        if (type === GET_MANY) {
          return httpClient.get(
            `${resource}?${qs.stringify(
              {
                ...query,
                id: params.ids,
              },
              { arrayFormat: "repeat" }
            )}`
          );
        }

        query = {
          ...query,
          ...filter,
        };

        if (pagination) {
          let { page, perPage } = pagination;

          query = {
            ...query,
            _start: (page - 1) * perPage,
            _end: page * perPage,
          };
        }

        if (sort && sort.length) {
          query = {
            ...query,
            _sort: sort.map((item) => item.by),
            _order: sort.map((item) => (item.desc ? "desc" : "asc")),
          };
        }

        let { data, headers } = await httpClient.get(
          `${resource}?${qs.stringify(query, { arrayFormat: "repeat" })}`
        );

        return {
          data,
          total: parseInt(headers["x-total-count"], 10),
        };
      }

      case GET_ONE: {
        let query = {};

        if (params.include) {
          let { embed, expand } = params.include;
          query = {
            _embed: embed,
            _expand: expand,
          };
        }

        return httpClient.get(
          `${resource}/${params.id}?${qs.stringify(query)}`
        );
      }

      case CREATE: {
        return httpClient.post(resource, params.data);
      }

      case UPDATE: {
        return httpClient.put(`${resource}/${params.id}`, params.data);
      }

      case DELETE: {
        return httpClient.delete(`${resource}/${params.id}`);
      }

      default:
        throw new Error(`Unsupported fetch action type ${type}`);
    }
  };

  return {
    [GET_LIST]: (resource, params) => fetchApi(GET_LIST, resource, params),
    [GET_MANY]: (resource, params) => fetchApi(GET_MANY, resource, params),
    [GET_ONE]: (resource, params) => fetchApi(GET_ONE, resource, params),
    [CREATE]: (resource, params) => fetchApi(CREATE, resource, params),
    [UPDATE]: (resource, params) => fetchApi(UPDATE, resource, params),
    [UPDATE_MANY]: (resource, params) =>
      Promise.all(
        params.ids.map((id) =>
          fetchApi(UPDATE, resource, { id, data: params.data })
        )
      ).then(() => Promise.resolve()),
    [DELETE]: (resource, params) => fetchApi(DELETE, resource, params),
    [DELETE_MANY]: (resource, params) =>
      Promise.all(
        params.ids.map((id) => fetchApi(DELETE, resource, { id }))
      ).then(() => Promise.resolve()),
  };
};
