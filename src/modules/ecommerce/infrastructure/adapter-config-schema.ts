import { z } from "zod";
import type {
  AdapterConfigMapping,
  AuthType,
  EndpointMapping,
  EndpointStep,
  LookupConfig,
  PaginationConfig,
  ResponseMapping,
} from "../domain/adapter-config";

const authType: z.ZodType<AuthType> = z.enum(["bearer", "basic", "apiKey", "oauth2"]);

const paginationConfigSchema: z.ZodType<PaginationConfig> = z.object({
  type: z.enum(["cursor", "offset", "link-header"]),
  cursorField: z.string().optional(),
  limitParam: z.string().optional(),
  maxPerPage: z.number().int().positive().optional(),
});

const responseMappingSchema: z.ZodType<ResponseMapping> = z.object({
  dataPath: z.string(),
  fieldMap: z.record(z.string()),
});

const lookupConfigSchema: z.ZodType<LookupConfig> = z.object({
  dataPath: z.string(),
  field: z.string(),
  againstVariable: z.string(),
  variableMap: z.record(z.string()),
  optional: z.boolean().optional(),
});

const endpointStepSchema: z.ZodType<EndpointStep> = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE"]),
  path: z.string().min(1),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.string()).optional(),
  body: z.record(z.unknown()).optional(),
  variableMap: z.record(z.string()).optional(),
  lookup: lookupConfigSchema.optional(),
});

const endpointMappingSchema: z.ZodType<EndpointMapping> = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
  path: z.string().min(1).optional(),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.string()).optional(),
  body: z.record(z.unknown()).optional(),
  responseMapping: responseMappingSchema,
  steps: z.array(endpointStepSchema).optional(),
});

const credentialFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "password", "url"]),
  required: z.boolean(),
  placeholder: z.string().optional(),
});

const adapterConfigMappingSchema = z.object({
  platformName: z.string().min(1),
  baseUrl: z.string().url(),
  authPattern: z.object({
    type: authType,
    headerName: z.string().optional(),
    tokenField: z.string().optional(),
  }),
  credentialSchema: z.object({
    fields: z.array(credentialFieldSchema),
  }),
  endpoints: z.object({
    getProducts: endpointMappingSchema,
    getOrders: endpointMappingSchema,
    getCustomers: endpointMappingSchema,
    fetchDiscounts: endpointMappingSchema,
    createCoupon: endpointMappingSchema,
    disableCoupon: endpointMappingSchema,
    fetchStoreInfo: endpointMappingSchema,
  }),
  pagination: paginationConfigSchema.optional(),
});

export type ValidatedAdapterConfigMapping = z.infer<typeof adapterConfigMappingSchema>;

export function validateAdapterConfigMapping(
  input: unknown,
): AdapterConfigMapping {
  return adapterConfigMappingSchema.parse(input) as AdapterConfigMapping;
}
