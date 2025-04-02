

# @stexcore/api-engine

![NPM Version](https://img.shields.io/npm/v/@stexcore/api-engine?style=flat-square) ![License](https://img.shields.io/github/license/stexcore/api-engine.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-%5E5.8.2-blue?style=flat-square)

**Engine for rapidly developing APIs using Express under the hood.**  
This library provides a modular and dynamic way to manage services, controllers, middlewares, and validation schemas, enabling developers to build robust and scalable APIs with ease.

---

## 🚀 Installation

Install the package from NPM using the following command:

```bash
npm install @stexcore/api-engine
```

---

## 📦 Features

| Feature             | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| **Server Initialization** | Easily create and configure servers with `createServer`.               |
| **Dynamic Loading**        | Automatically load controllers, services, schemas, and middlewares.   |
| **Validation Support**     | Create schemas with `createSchema` for request validation.            |
| **Modular Services**       | Use the `Service` class to define reusable components with lifecycles.|
| **Controller Routing**     | Define HTTP methods with the `Controller` class.                     |

---

## 🧩 Dynamic Endpoint Creation

### 📂 Controllers

Controllers define the logic for your API's endpoints. To ensure they are loaded dynamically and correctly, follow these rules:
1. **Location:** Controllers must be stored inside the `controllers/` directory.
2. **File Naming:** The file name must end with `.controller.ts` or `.controller.js`.
3. **Path Structure:** The file name determines the endpoint. For example:
   - `auth.controller.ts` → `/auth`
   - `auth.user.controller.ts` → `/auth/user`
4. **Dynamic Segments:** To define dynamic segments in the endpoint, enclose the segment in square brackets (`[]`). For example:
   - `auth.user.[id_user].controller.ts` → `/auth/user/:id_user`

#### Example:
File: `src/controllers/auth.user.[id_user].controller.ts`
```typescript
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

### 📂 Schemas

Schemas define validation rules for incoming requests. Their naming follows the same rules as controllers, but the file name must end with `.schema.ts`.

#### Example:
File: `src/schemas/auth.user.schema.ts`
```typescript
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

### 📂 Middlewares

Middlewares handle cross-cutting concerns (e.g., logging, authentication). To ensure middlewares are loaded correctly:
1. **Location:** Middlewares must be stored inside the `middlewares/` directory.
2. **File Naming:** The file name must end with `.middleware.ts` or `.middleware.js`.
3. **Subpaths:** To associate middlewares with specific paths, use folder structures. Middlewares will apply to the base path they are defined under and all its subpaths. For example:
   - Middleware in `middlewares/auth/log.middleware.ts` will apply to `/auth`, `/auth/user`, `/auth/user/:id_user`, etc.

#### Example:
File: `src/middlewares/auth/user/log.middleware.ts`
```typescript
import { RequestHandler } from "express";

const logMiddleware: RequestHandler = (req, res, next) => {
    console.log(`Request to \${req.path}`);
    next();
};

export default logMiddleware;
```

### 📂 Services

Services encapsulate reusable business logic. They must follow these rules:
1. **Location:** Services must be stored inside the `services/` directory.
2. **File Naming:** The file name must end with `.service.ts`.

To use a service, call `server.getService()` with the service's constructor.

#### Example:
File: `src/services/auth.service.ts`
```typescript
import { Service } from "@stexcore/api-engine";

export default class AuthService extends Service {
    public authenticateUser(token: string) {
        // Authentication logic
        return token === "valid_token";
    }
}
```

---

## 🌐 Full Example: Building an API

### Project Structure
```
src/
├── controllers/
│   ├── auth.user.[id_user].controller.ts
├── middlewares/
│   ├── auth/user/log.middleware.ts
├── schemas/
│   ├── auth.user.schema.ts
├── services/
│   ├── auth.service.ts
├── index.ts
```

#### Entry Point
File: `src/index.ts`
```typescript
import { createServer } from "@stexcore/api-engine";

const server = createServer({ port: 9001, workdir: __dirname });
server.initialize();
```

---

## 🛠️ Development
If you'd like to contribute or report issues, visit our GitHub repository:  
[https://github.com/stexcore/api-engine](https://github.com/stexcore/api-engine)

---

## 📝 License
This project is licensed under the **MIT** license. See the [LICENSE](https://github.com/stexcore/api-engine/blob/main/LICENSE) file for more details.

---