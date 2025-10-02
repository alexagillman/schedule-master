import { z } from 'zod';
import { collection } from '@github/spark/db';

export const event = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string(), // YYYY-MM-DD format
  startTime: z.string(), // HH:MM format
  endTime: z.string(), // HH:MM format
  createdAt: z.number().default(() => Date.now()),
});

export const eventCollection = collection(event, 'events');