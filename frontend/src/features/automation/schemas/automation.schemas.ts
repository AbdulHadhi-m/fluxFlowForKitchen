import { z } from "zod";

export const workflowStepSchema = z.object({
  code: z.string().min(1, "Step code is required").max(64),
  name: z.string().min(1, "Step name is required").max(200),
  type: z.enum(["ACTION", "CONDITION", "APPROVAL", "WAIT", "BRANCH", "END"]),
  config: z.record(z.any()).default({}),
  next: z.string().optional(),
  on_true: z.string().optional(),
  on_false: z.string().optional(),
});

export type ConditionNode = z.ZodTypeAny;

export const conditionNodeSchema: ConditionNode = z
  .lazy(() =>
    z.union([
      z.object({
        field: z.string().min(1),
        operator: z.string().min(1),
        value: z.any().optional(),
      }),
      z.object({
        operator: z.enum(["AND", "OR", "NOT"]),
        conditions: z.array(conditionNodeSchema).default([]),
      }),
    ])
  )
  .default({ operator: "AND", conditions: [] });

export const workflowPayloadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(64)
    .regex(/^[A-Z0-9_]+$/, "Code must be uppercase letters, numbers and underscores"),
  description: z.string().max(2000).optional(),
  category: z
    .enum([
      "INVENTORY",
      "PROCUREMENT",
      "FINANCE",
      "CUSTOMER",
      "SUPPORT",
      "HR",
      "MARKETING",
      "OPERATIONS",
      "PAYMENT",
      "LOYALTY",
      "OTHER",
    ])
    .optional(),
  trigger_type: z.enum(["EVENT", "SCHEDULE", "MANUAL", "WEBHOOK"]).optional(),
  trigger_config: z.record(z.any()).optional(),
  scope: z.enum(["GLOBAL", "RESTAURANT"]).optional(),
  conditions: z.record(z.any()).optional(),
  steps: z.array(workflowStepSchema).optional(),
  timeout_minutes: z.number().int().min(1).max(10080).optional(),
  max_steps: z.number().int().min(1).max(500).optional(),
  max_retries: z.number().int().min(0).max(10).optional(),
  max_nested_depth: z.number().int().min(0).max(10).optional(),
});

export type WorkflowPayloadForm = z.infer<typeof workflowPayloadSchema>;

export const taskStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]);