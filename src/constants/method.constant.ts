import { IMethod } from "../types/types";

/**
 * All methods
 */
export const methods: {
    [key in IMethod]: string
} = {
    "GET": "GET".green,
    "POST": "POST".yellow,
    "PUT": "PUT".blue,
    "DELETE": "DELETE".red,
    "PATCH": "PATCH".gray,
    "HEAD": "HEAD".green,
    "OPTIONS": "OPTIONS".magenta,
} as const;