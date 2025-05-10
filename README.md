# @stexcore/api-engine

[![NPM Version](https://img.shields.io/npm/v/@stexcore/api-engine?style=flat-square)](https://www.npmjs.com/package/@stexcore/api-engine) [![License](https://img.shields.io/github/license/stexcore/api-engine.svg)](https://github.com/stexcore/api-engine/blob/main/LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-%5E5.8.2-blue?style=flat-square)](https://www.typescriptlang.org/)

**Engine for rapidly developing APIs using Express under the hood.**  
This library provides a modular and dynamic way to manage services, controllers, middlewares, and validation schemas, enabling developers to build robust and scalable APIs with ease.

---

## Overview

`@stexcore/api-engine` is a lightweight engine built on top of Express that dynamically loads and registers controllers, services, middlewares, and validation schemas. Its key benefits include:

- **Modular Server Initialization:**  
  Easily configure your API server using the `createServer` function. All modules (controllers, services, schemas, middlewares) are automatically discovered based on your project structure.

- **Dynamic Module Loading:**  
  Controllers, schemas, and middlewares are loaded dynamically from dedicated directories. The file naming convention drives the endpoint definitions and associations.

- **Validation Integration:**  
  Leverage Joi validations by simply defining your schema files and registering them via the `createSchema` function.

- **Reusable Services:**  
  Encapsulate business logic in services with lifecycle hooks (`initialize`/ `destroy`) that can be retrieved anywhere within your API.

- **Intelligent Routing:**  
  Endpoints are defined by file names including support for dynamic route segments, making it effortless to create RESTful APIs.

---

## 🚀 Installation

Install via NPM:

```bash
npm install @stexcore/api-engine
```

Be sure to have [Node.js](https://nodejs.org/) installed. The library also depends on packages such as Express, Joi, and `@stexcore/http-status`.

---

## ⚙️ Quick Start

Your entry point should be a simple file (e.g., `src/index.ts`) that creates and starts the server:

```typescript
// src/index.ts
import { createServer } from "@stexcore/api-engine";

const server = createServer({ port: 9001, workdir: __dirname });
server.initialize().then(() => {
  console.log("Server is up and running on port 9001");
});
```

The `createServer` function instantiates the core `Server` class, sets up the Express application, and dynamically loads controllers, schemas, services, and middlewares from the specified work directory.

---

## 📦 Features

| Feature                    | Description                                                                                      |
|----------------------------|--------------------------------------------------------------------------------------------------|
| **Server Initialization**  | Easily create and configure the API server using `createServer`.                                  |
| **Dynamic Module Loading** | Automatically discover and load controllers, services, schemas, and middlewares based on folder structure. |
| **Validation Support**     | Define request validation schemas with `createSchema` using Joi.                                 |
| **Service Lifecycle**      | Create reusable services with lifecycle methods (`initialize`/`destroy`) via the `Service` class.  |
| **Dynamic Routing**        | Define endpoints (both static and dynamic) by simply naming your controller files appropriately. |

---

## 🧩 Module Breakdown

### Entry Point (`src/index.ts`)

This file exports core functions and classes:

- **`createServer(config: IServerConfig)`**  
  Instantiates the main `Server` class, which handles the initialization and dynamic loading of all modules.

- **`createSchema(schema: ISchema)`**  
  Generates a new schema instance from custom validations. This instance can later be associated with endpoints for request validation.

The file also exports the base classes (`Server`, `Controller`, `Service`) to enable extensibility.

---

### 📂 Controllers

Controllers define the logic for API endpoints. To load controllers dynamically:

1. **Location:** Place controllers under the `controllers/` directory.
2. **File Naming:** Names must end with `.controller.ts` or `.controller.js`.
3. **Path Derivation:**  
   - For example, `auth.controller.ts` maps to `/auth`.
   - Dynamic segments are defined between square brackets.  
     Example: `auth.user.[id_user].controller.ts` maps to `/auth/user/[id_user]` where `[id_user]` becomes a route parameter.

#### Example:
```typescript
// src/controllers/auth.user.[id_user].controller.ts
import { RequestHandler } from "express";
import { Controller, Server } from "@stexcore/api-engine";

export default class UserController extends Controller {
  constructor(server: Server) {
    super(server);
  }

  public GET?: RequestHandler = (req, res) => {
    res.json({ message: `User ID: \${req.params.id_user}` });
  };
}
```

---

### 📂 Schemas

Schemas provide request validations and follow the same mapping paradigm as controllers but must end with `.schema.ts`.

#### Example:
```typescript
// src/schemas/auth.user.schema.ts
import { createSchema } from "@stexcore/api-engine";
import Joi from "joi";

export default createSchema({
  GET: {
    query: Joi.object({
      search: Joi.string().optional(),
    }),
  },
});
```

---

### 📂 Middlewares

Middlewares allow you to inject cross-cutting concerns (e.g., logging, error handling, authentication) into your request lifecycle.

1. **Location:** Store middlewares under the `middlewares/` directory.
2. **File Naming:** Must end with `.middleware.ts` or `.middleware.js`.
3. **Sub-Directories as Scopes:**  
   A middleware placed under `middlewares/auth/` applies to routes starting with `/auth`.

#### Example:
```typescript
// src/middlewares/auth/user/log.middleware.ts
import { RequestHandler } from "express";

const logMiddleware: RequestHandler = (req, res, next) => {
  console.log(`Request to \${req.path}`);
  next();
};

export default logMiddleware;
```

---

### 📂 Services

Services encapsulate business logic and are located under the `services/` directory. They often include lifecycle hooks (`initialize` and `destroy`).

#### Example:
```typescript
// src/services/auth.service.ts
import { Service } from "@stexcore/api-engine";

export default class AuthService extends Service {
  public authenticateUser(token: string) {
    // Implement your authentication logic
    return token === "valid_token";
  }
}
```

Access a service by calling `server.getService(AuthService)` after registering it with `server.registerService(AuthService)`.

---

## 🌐 Full Example: Building an API

### Project Structure
```
src/
├── controllers/
│   ├── auth.user.[id_user].controller.ts
├── middlewares/
│   └── auth/user/log.middleware.ts
├── schemas/
│   └── auth.user.schema.ts
├── services/
│   └── auth.service.ts
└── index.ts
```

#### Entry Point (`src/index.ts`)
```typescript
import { createServer } from "@stexcore/api-engine";

const server = createServer({ port: 9001, workdir: __dirname });
server.initialize().then(() => {
  console.log("Server is running on port 9001");
});
```

When the server starts:
- **Services** are registered and initialized.
- **Middlewares** are attached based on their folder hierarchy.
- **Schemas** are loaded and associated with corresponding routes.
- **Controllers** are discovered and mapped to endpoints (with support for dynamic segments).

---

## 🛠️ Development

If you’d like to contribute or report issues, please visit the GitHub repository:  
[https://github.com/stexcore/api-engine](https://github.com/stexcore/api-engine)

### Building the Project

Compile TypeScript using:

```bash
npm run build
```

---

## 📝 License

This project is licensed under the **MIT** license. See the [LICENSE](https://github.com/stexcore/api-engine/blob/main/LICENSE) file for details.