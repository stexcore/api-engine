# @stexcore/api-engine

[![NPM Version](https://img.shields.io/npm/v/@stexcore/api-engine?style=flat-square)](https://www.npmjs.com/package/@stexcore/api-engine) [![License](https://img.shields.io/github/license/stexcore/api-engine.svg)](https://github.com/stexcore/api-engine/blob/main/LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-%5E5.8.2-blue?style=flat-square)](https://www.typescriptlang.org/)

**Engine for rapidly developing APIs using Express under the hood.**  
This library provides a modular and dynamic way to manage services, controllers, middlewares, and validation schemas, enabling developers to build robust and scalable APIs with ease.

---

## Overview

`@stexcore/api-engine` is a lightweight, expressive framework built on top of **Express**, designed to accelerate the creation of modular, dynamic, and scalable APIs.

It promotes a **plug-and-play development model** by automatically discovering and wiring together controllers, middlewares, schemas, services, and pipes — all based on your file structure.

Whether you're building a compact REST API or a deeply nested route-driven system, this engine adapts to your architecture thanks to its flexible file loading modes.

### ✨ Core Benefits

- **Minimal Bootstrapping:** Start with a single line using `createServer()` — no manual registration needed.
- **File-System Driven:** Define routes by naming files, with dynamic segments and deep nesting supported.
- **Zero-Friction Validation:** Attach `Joi`-powered schemas to your endpoints with full type safety.
- **Modular Services:** Inject reusable business logic anywhere using the built-in service layer.
- **Extendable Pieces:** Customize controllers, middlewares, pipes and more by extending intuitive base classes.

---

## 🚀 Installation

Install the library via NPM:

```bash
npm install @stexcore/api-engine
```

### 🔗 Peer Dependencies

Make sure you have the following installed in your project:

- [Node.js](https://nodejs.org/) (version 18+ recommended)
- [`express`](https://www.npmjs.com/package/express) (optional)
- [`joi`](https://www.npmjs.com/package/joi) (optional)
- [`@stexcore/http-status`](https://www.npmjs.com/package/@stexcore/http-status) (recommended)

You can install them together if needed:

```bash
npm install express joi @stexcore/http-status
```

Now you're ready to bootstrap your API engine!

---

## ⚙️ Quick Start

The fastest way to get started is by initializing a server instance using the `createServer()` function or by creating the `Server` class directly.

The engine auto-discovers your controllers, middlewares, schemas, services, and pipes based on your project's file structure and selected `mode`.

### 📁 Example: Minimal Entry Point

```ts
// src/index.ts
import { createServer } from "@stexcore/api-engine";

const server = createServer({
  port: 9200,
  workdir: __dirname,
  mode: "tree", // Optional: 'compact' (default) | 'tree'
});

server.initialize()
  .then(() => {
    console.log("Server is running on port 9200");
  })
  .catch(console.error);
```

This sets up:

- File-based discovery of all components: controllers, middlewares, schemas, services, and pipes.
- Routing derived from file names and directory placement.
- Validations that ensure modules are properly exported and extend their expected base classes.

For detailed setup styles, see [Project Structure Modes](#project-structure-modes).

---

## 📁 Project Structure Modes

`@stexcore/api-engine` allows you to organize your codebase in two flexible layout styles using the `mode` property: **`compact`** (the default) and **`tree`**.

This configuration defines how the engine scans your file system to load your controllers, schemas, middlewares, services, and pipes — all dynamically.

---

### 🔧 How to configure

When initializing your server, pass the `mode` field in the configuration:

```ts
const server = createServer({
  port: 9001,
  workdir: __dirname,
  mode: "tree", // Options: "compact" (default) | "tree"
});
```

---

## 🗂️ Mode: `compact` (default)

In this mode, each type of component (controller, middleware, pipe, schema, service) is grouped by type in its own dedicated folder.

It's ideal for small to medium projects with simpler route hierarchies.

```
src/
├── controllers/
│   └── auth.user.[id_user].controller.ts
├── middlewares/
│   └── auth.user.[id_user].middleware.ts
├── pipes/
│   └── auth.user.[id_user].pipe.ts
├── schemas/
│   └── auth.user.[id_user].schema.ts
├── services/
│   └── auth.service.ts
└── index.ts
```

#### 📌 Segment Breakdown in `compact` Mode

The file name represents the entire route path. Each segment is separated by a dot `.`, and **dynamic parameters** are enclosed in square brackets.

| File Name                            | Maps To Route         | Notes                                 |
|-------------------------------------|------------------------|----------------------------------------|
| `auth.controller.ts`               | `/auth`              | Static segment                         |
| `auth.user.controller.ts`          | `/auth/user`         | Nested static segments                 |
| `auth.user.[id_user].controller.ts`| `/auth/user/:id_user`| Dynamic param named `id_user`        |

Dynamic route segments support full validation, schema association, and middleware binding.

Each file is responsible for a single piece (e.g., one controller class) and should use a consistent extension pattern like:

- `*.controller.ts`
- `*.middleware.ts`
- `*.pipe.ts`
- `*.schema.ts`

#### 📚 Services in `compact` Mode

Services live under `services/` and typically follow the naming pattern `*.service.ts`.

They are loaded globally and do not affect routing directly.

Example:

```ts
src/
├── services/
│   └── auth.service.ts
```

---

## 🌳 Mode: `tree`

In this mode, components are colocated by route segment. This layout is inspired by file-based routing systems and is ideal for scalable APIs with deep nesting or domain-driven structure.

```
src/
├── app/
│   └── auth/
│       └── user/
│           └── [id_user]/
│               ├── controller.ts
│               ├── middleware.ts
│               ├── pipe.ts
│               └── schema.ts
├── services/
│   └── auth.service.ts
└── index.ts
```

- 📂 The folder hierarchy **maps directly to your API path**.
- 🧠 A folder like `auth/user/[id_user]/` translates to `/auth/user/:id_user`.
- 🧱 Each folder may define multiple pieces (e.g., a controller and schema for the same route).

#### 📚 Services in `tree` Mode

Services remain global and are still expected under `services/`, even when route-level logic is deeply nested under `app/`. This keeps business logic decoupled and reusable across routes.

---

### 📌 Behavior Across Modes

No matter the mode, **the behavior of your exported classes stays the same**:

| Feature                 | `compact`                            | `tree`                                   |
|-------------------------|----------------------------------------|---------------------------------------------|
| File routing format     | Flat, naming-driven                    | Hierarchical, folder-based                  |
| Path mapping            | Derived from filename                  | Derived from folder path                    |
| Class implementation    | Same: extends Controller, Middleware… | Same: extends Controller, Middleware…       |
| Dynamic segments        | `[param]` in file name               | `[param]` in folder names                 |
| Component types allowed | 1 type per file                        | Multiple files per route segment folder     |
| Service location        | `/services/*.service.ts`             | `/services/*.service.ts` (unchanged)      |

---

### ✅ When to choose each mode

| Use case                                         | Recommended Mode |
|--------------------------------------------------|------------------|
| Flat projects with many unrelated endpoints      | `compact`       |
| Nested domains with shared route segments        | `tree`          |
| Teams familiar with file-system routing (e.g. Next.js) | `tree`    |
| Migrating from a legacy controller directory     | `compact`       |

---

Both modes are supported equally across all loaders — choose the one that matches your team’s mental model and scaling needs.

---

## 📦 Features

@stexcore/api-engine offers a powerful yet minimal abstraction layer on top of Express, designed for developer productivity and runtime clarity.

| Feature                     | Description                                                                 |
|-----------------------------|-----------------------------------------------------------------------------|
| **Dynamic File-Based Loading** | Auto-discovers all pieces (controllers, schemas, middlewares, pipes, services) based on file structure. |
| **Routing by Convention**     | Route paths are derived from filenames or folder hierarchy depending on selected `mode`. |
| **Dynamic Segments**          | Define route parameters using `[param]` syntax in either file or folder names. |
| **Schema-Driven Validation**  | Integrates with Joi to bind request validations to each HTTP method in schemas. |
| **Lifecycle-Aware Services**  | Create reusable service classes with optional `initialize()` and `destroy()` hooks. |
| **Customizable Middlewares**  | Define middlewares with full support for both handler and error boundaries. |
| **Pluggable Pipe System**     | Attach transformation or filtering logic to endpoints using dedicated pipe classes. |
| **Express Compatible**        | Fully compatible with native Express handlers, routers, and middleware patterns. |
| **Lightweight & Extensible**  | Minimal opinionation and clean base classes make it easy to extend for advanced scenarios. |

---

## ♻️ Lifecycle & Load Order

Understanding the boot process of `@stexcore/api-engine` is key to unlocking its true modular potential.

The following lifecycle occurs when calling `server.initialize()` — which is responsible for discovering, loading, and wiring together all modular pieces in the correct order.

---

### 🔄 Load Order

1. **Services**
2. **Pipes**
3. **Schemas**
4. **Middlewares**
5. **Controllers**

---

### 🧬 Why Load Order Matters

Each piece of the engine has a role — and that role is often interdependent. Here's why this particular order is essential:

#### 1. 🧩 **Services**

Services are initialized **first** because they act as the application's dependency core. They may reference each other, and all other modules (controllers, middlewares, pipes) can retrieve them using `this.$()` or `getService()`.

This ensures the entire app has access to shared logic and state from the very beginning.

#### 2. 🧪 **Pipes**

Pipes are technically middlewares — but they are loaded **before** schemas to allow data transformation at the "pre-validation" phase.

Perfect for:

- Parsing custom `Content-Type` formats
- Normalizing request payloads
- Filtering input before validation

#### 3. 📜 **Schemas**

After pipes, schemas are loaded and attached to validate:

- `req.body`
- `req.query`
- `req.params`
- `req.headers`

Validation is powered by Joi and provides full type-safe guards before your business logic kicks in.

#### 4. 🧱 **Middlewares**

Middlewares come next to perform tasks like:

- Authentication
- Session retrieval
- Authorization guards

They can also define `errors: IMiddlewareError`, which internally gets registered **after** all routes, respecting Express’s error-handling contract (error middlewares must be last).

#### 5. 🎯 **Controllers**

Finally, route handlers are registered. Controllers implement logic per HTTP method and delegate most of their work to reusable services.

If any previous piece failed — e.g. a pipe throws during transformation, or a schema fails validation — the engine short-circuits and hands the error off to the appropriate error request handler if defined.

---

Knowing this lifecycle lets you:

- Properly inject and chain behaviors
- Build safe, ordered logic (e.g., pipe ➜ schema ➜ auth middleware ➜ controller)
- Avoid headaches when debugging app-wide behaviors

To visualize how these modules are constructed, see [Module Breakdown](#-module-breakdown).

---

## 🧩 Module Breakdown

Each module type in `@stexcore/api-engine` plays a specific role and follows a simple convention to be auto-loaded at runtime.

Regardless of the selected `mode` (`compact` or `tree`), the **logic and behavior of your classes remains exactly the same** — only their location differs.

---

### ⚙️ Services

Services are application-scoped singletons used to encapsulate business logic, shared state, third-party integrations, or any reusable abstraction across your API.

Each service class must:

- Extend the `Service` class (which itself extends [Piece](#-the-piece-class))
- Export a default class
- Optionally implement lifecycle hooks: `initialize()` and `destroy()`

---

### 🔎 Anatomy

```ts
export default class Service extends Piece {
  public initialize?(): void;
  public destroy?(): void;
}
```

- The optional `initialize()` method runs once when `server.initialize()` is called.
- The optional `destroy()` method runs when the server is shutting down.
- Like all `Piece`-based modules, you have access to `this.server` and can inject other services via `this.$(OtherService)`.

---

### 🧠 Usage Example

```ts
// src/services/logger.service.ts
import { Service } from "@stexcore/api-engine";

export default class LoggerService extends Service {
  public initialize() {
    console.log("[Logger] Ready!");
  }

  public log(msg: string) {
    console.log("[LOG]", msg);
  }
}
```

Any module (controllers, middlewares, pipes...) can access services like this:

```ts
const logger = this.$(LoggerService);
logger.log("Hello from route!");
```

---

### 📁 File Placement

| Mode    | Path Example                     | Notes                        |
|---------|----------------------------------|------------------------------|
| any     | `services/logger.service.ts`   | Same in both modes           |

**Convention:** Always use the `.service.ts` suffix and place services in the global `services/` directory.

---

Services are registered before any other module during initialization — making them the perfect place for persistent connections, shared memory, or utility logic.

---

### 🔃 Pipes

Pipes allow you to intercept and transform request data **before** it reaches the schema validator or controller logic. They're ideal for:

- Parsing custom payloads (e.g., non-JSON bodies)
- Transforming query strings or headers
- Sanitizing or normalizing incoming data

Each pipe must:

- Extend the `Pipe` class (which itself extends [Piece](#-the-piece-class))
- Export a default class
- Implement a read-only `handler: IMiddewareHandler` (works like an Express middleware)

---

### 🔎 Anatomy

```ts
export default abstract class Pipe extends Piece {
  public readonly abstract handler: IMiddewareHandler;
}
```

Because `Pipe` is an abstract class, your implementation **must** define the handler middleware. Like all pieces, it has access to:

- The server instance via `this.server`
- Any injected service via `this.$(SomeService)`

Pipes are executed **before** schemas and middlewares — giving them a privileged position to alter the request flow.

---

### 🧪 Usage Example

```ts
// src/app/form/submit/pipe.ts (tree mode)
import { Pipe } from "@stexcore/api-engine";

export default class RawBodyPipe extends Pipe {
  public readonly handler = (req, _res, next) => {
    if (req.headers["content-type"] === "application/x.custom") {
      try {
        req.body = customParser(req);
      } catch (err) {
        return next(err);
      }
    }
    next();
  };
}
```

---

### 📁 File Placement

| Mode    | Path Example                                       | Notes                      |
|---------|----------------------------------------------------|----------------------------|
| compact | `pipes/form.submit.pipe.ts`                      | File name maps to route    |
| tree    | `app/form/submit/pipe.ts`                        | Folder-based structure     |

**Convention:** Always use the suffix `.pipe.ts` (or just `pipe.ts` in tree mode).

---

Pipes are small but powerful — they act as preprocessors that seamlessly fit into your request lifecycle. Use them wisely to encapsulate parsing, filtering, or coercion logic close to the route.

---

### ✅ Schemas

Schemas define request validation logic per HTTP method using [Joi](https://joi.dev/). They are executed **after pipes** and **before middlewares/controllers** — forming your app's first layer of input integrity.

Each schema module must:

- Extend the base `Schema` class **or** be created via `createSchema()`
- Export a default instance or class
- Define optional rules for any HTTP method: `GET`, `POST`, etc.

---

### 🔎 Anatomy

The `Schema` class allows method-specific validation for:

- `query`: URL search parameters
- `params`: dynamic path segments
- `headers`: HTTP request headers
- `body`: JSON or raw body

Each method (`GET`, `POST`, etc.) accepts an `ISchemaRequest` object with any combination of these fields.

```ts
export interface ISchemaRequest {
  params?: Joi.ObjectSchema;
  body?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
}
```

---

### 🧠 Class-Based Schema Example

```ts
// src/app/user/[id]/schema.ts
import { Schema } from "@stexcore/api-engine";

export default class UserSchema extends Schema {
  public GET = {
    params: this.joi.object({
      id: this.joi.string().uuid().required(),
    }),
  };
}
```

You can use `this.joi` inside the schema to access Joi utilities.

---

### 🧩 createSchema() Alternative

If you prefer object-based definitions without subclassing:

```ts
// schema.ts
import { createSchema, joi } from "@stexcore/api-engine";

export default createSchema({
  GET: {
    query: joi.object({
      search: joi.string().optional(),
    }),
  },
});
```

This is functionally equivalent and fully supported — although less extensible.

---

### 📁 File Placement

| Mode    | Path Example                         | Notes                             |
|---------|--------------------------------------|-----------------------------------|
| compact | `schemas/user.[id].schema.ts`     | File name maps to path segments   |
| tree    | `app/user/[id]/schema.ts`         | Folder-based route mapping        |

**Convention:** Use the `.schema.ts` suffix (or just `schema.ts` in tree mode).

---

Schemas are one of the most powerful ways to enforce stability, safety, and consistency across your API endpoints — with zero runtime ambiguity.

---

### 🧱 Middlewares

Middlewares are modular request filters applied **after validation** and **before your controller logic**. They’re ideal for:

- Authentication & authorization
- Attaching user/session context
- Logging or rate-limiting
- Custom error boundaries

Each middleware must:

- Extend the `Middleware` base class (which itself extends [Piece](#-the-piece-class))
- Export a default class
- Implement at least a `handler` method
- (Optional) Implement an `errors` handler for request-level exceptions

---

### 🔎 Anatomy

```ts
export abstract class Middleware extends Piece {
  public readonly handler?: IMiddewareHandler;
  public readonly errors?: IMiddlewareError;
}
```

- `handler` is a regular or array of Express-style middlewares.
- `errors` is an optional Express error handler (or array) attached **after** routes for compliance with Express’s middleware lifecycle.

Both are read-only and required to be defined at runtime.

---

### 🧠 Usage Example

```ts
import { Middleware } from "@stexcore/api-engine";
import AuthService from "../../services/auth.service";

export default class AuthMiddleware extends Middleware {
  auth = this.$(AuthService);

  public handler = (req, res, next) => {
    try {
      const ok = this.auth.auth(req.query.authorization);
      if (!ok) throw new Error("Unauthorized");
      next();
    } catch (err) {
      next(err);
    }
  };

  public errors = (err, req, res, next) => {
    console.error("[Middleware Error]", err);
    next(err);
  };
}
```

---

### 📁 File Placement

| Mode    | Path Example                                | Notes                             |
|---------|---------------------------------------------|-----------------------------------|
| compact | `middlewares/auth.user.[id].middleware.ts`| Filename maps to path             |
| tree    | `app/auth/user/[id]/middleware.ts`        | Folder-hierarchical structure     |

**Convention:** Use the suffix `.middleware.ts` (or just `middleware.ts` in tree mode).

---

### ⚠️ Error Handling Behavior

If `errors` is defined, it will be **automatically attached as the last error middleware** for that route scope. This honors Express’s error pipeline and ensures your custom handlers receive validation, auth, or runtime exceptions at the correct time.

---

Middlewares are your app’s gatekeepers — lean, readable, and powerful when chained with schemas and pipes. Think of them as guardrails between validation and business logic.

---

### 📂 Controllers

Controllers define the behavior for each API route, handling incoming HTTP requests through expressive class-based handlers.

Each controller must:

- Extend the `Controller` base class (which itself extends [Piece](#-the-piece-class))
- Export a default class
- Optionally implement one or more HTTP handlers: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`

---

### 🔎 Anatomy

The `Controller` class inherits from a shared base called [Piece](#-the-piece-class), which gives it direct access to:

- The server instance via `this.server`
- Any injected service via helper methods like `this.$(YourService)`

Each supported HTTP method is defined as an optional property with Express-compatible signatures.

```ts
export default class Controller extends Piece {
  public GET?: IRequestHandler;
  public POST?: IRequestHandler;
  public PUT?: IRequestHandler;
  public DELETE?: IRequestHandler;
  public PATCH?: IRequestHandler;
  public HEAD?: IRequestHandler;
  public OPTIONS?: IRequestHandler;
}
```

---

### 🛠️ Usage Example

```ts
// src/app/user/[id]/controller.ts (tree mode)
import { Controller, IRequestHandler } from "@stexcore/api-engine";
import UserService from "../../../services/user.service";

export default class UserController extends Controller {
  user = this.$(UserService);

  public GET: IRequestHandler = (req, res, next) => {
    try {
      const data = this.user.findById(req.params.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  };
}
```

---

### 📁 File Placement

| Mode    | Path Example                                             | Notes                      |
|---------|-----------------------------------------------------------|----------------------------|
| compact | `controllers/user.[id].controller.ts`                 | Name defines full path     |
| tree    | `app/user/[id]/controller.ts`                          | Folder hierarchy as path   |

**Convention:** Always use the suffix `.controller.ts` (or just `controller.ts` in tree mode).

---

Controllers should stay focused on routing logic. Shared behavior and complex operations should be delegated to services — made easily accessible via [Piece](#-the-piece-class).

---

### 🧱 The Piece Class

At the foundation of every major component in `@stexcore/api-engine` — whether it’s a controller, middleware, pipe, or service — lives a minimal but powerful base class: `Piece`.

This abstract class provides shared functionality and a consistent interface across all modules, while simplifying access to services and the server instance.

---

### 🧬 Anatomy

```ts
export class Piece {
  constructor(public readonly server: Server) {}

  public getService<S extends Service>(service: new (s: Server) => S): S {
    return this.server.getService(service);
  }

  public service$ = this.getService;
  public $ = this.getService;
}
```

All modules extending from `Piece` automatically gain:

- Access to the engine's server instance via `this.server`
- Full service injection capabilities via:
  - `this.$(MyService)` (preferred, shorthand)
  - `this.service$(MyService)`
  - `this.getService(MyService)`

These methods ensure strong typing and unified access to the service layer from any part of your app.

---

### 🔍 How Service Resolution Works

When you call `this.$(SomeService)`, you're accessing a **pre-instantiated singleton** that was resolved during the server's initialization phase.

Under the hood:

1. During `server.initialize()`, all service classes in `/services` are discovered.
2. The engine builds a **dependency graph**, instantiating each service in the correct order.
3. If a circular reference is detected between services, an exception is thrown.
4. Once instantiated, each service has its `initialize()` method (if defined) called immediately.
5. Services are then stored in the engine’s internal registry and made globally accessible via `this.$(...)`.

🧠 **Note:** Services are eagerly loaded — they are **not instantiated lazily or per-request**. Your app can rely on their presence from the moment initialization completes.

---

### 🧱 Service Dependency Example

```ts
import { Service } from "@stexcore/api-engine";
import LoggerService from "./logger.service";

export default class UserService extends Service {
  logger = this.$(LoggerService);

  findById(id: string) {
    this.logger.log("Fetching user:", id);
    return { id, name: "Admin" };
  }
}
```

---

### 🛑 Don't Use Piece Directly

While `Piece` is the core abstraction behind your modules, **you should never extend or define it directly**.

Avoid doing this:

```ts
// ❌ Invalid usage — not loadable
export default class FooPiece extends Piece {}
```

There is **no such thing as a "piece module"**. The engine only recognizes and loads modules based on the following structures:

- `Controller`
- `Middleware`
- `Pipe`
- `Service`

Stick to these for proper discovery and runtime behavior.

---

`Piece` gives you DI power, context awareness, and access to server-level state — all without forcing unnecessary abstraction or boilerplate. It’s the invisible glue behind your application’s modular clarity.

## 📚 Usage Patterns

Forget toy examples — this section shows **realistic, production-ready compositions** that fully embrace the modular architecture of `@stexcore/api-engine`.

Each pattern below combines multiple module types (controllers, middlewares, pipes, services, schemas), highlighting features like dependency injection, lifecycle flows, pre-validation filtering, and structured error handling.

---

### 🧩 Pattern #1 — Custom Payload Flow

**Transform ↪ Validate ↪ Authorize ↪ Handle**

🔧 Use case: API receives a request with a custom `Content-Type`, parses it in a pipe, validates fields via schema, checks user session with middleware, then continues to the controller.

#### 🗂 Folder layout (tree mode)

```
src/
├── app/
│   └── post/
│       └── publish/
│           ├── controller.ts
│           ├── pipe.ts
│           ├── schema.ts
│           └── middleware.ts
├── services/
│   ├── parser.service.ts
│   └── session.service.ts
```

#### 🔃 pipe.ts — parse custom payload before Joi validation

```ts
import { Pipe } from "@stexcore/api-engine";
import ParserService from "../../../services/parser.service";

export default class CustomPipe extends Pipe {
  parser = this.$(ParserService);

  public readonly handler = (req, _res, next) => {
    if (req.headers["content-type"] === "application/x.custom") {
      try {
        req.body = this.parser.parseCustom(req.body as string);
      } catch (e) {
        return next(new Error("Invalid custom payload"));
      }
    }
    next();
  };
}
```

#### 📜 schema.ts — enforce shape of payload after pipe

```ts
import { Schema } from "@stexcore/api-engine";

export default class PublishSchema extends Schema {
  public POST = {
    body: this.joi.object({
      title: this.joi.string().required(),
      content: this.joi.string().min(20),
    }),
  };
}
```

#### 🧱 middleware.ts — validate user session and short-circuit if missing

```ts
import { Middleware } from "@stexcore/api-engine";
import SessionService from "../../../services/session.service";

export default class AuthMiddleware extends Middleware {
  session = this.$(SessionService);

  public handler = (req, res, next) => {
    try {
      const user = this.session.get(req);
      if (!user) throw new Error("No session");
      req.context = { user };
      next();
    } catch (err) {
      next(err);
    }
  };

  public errors = (_err, _req, res, _next) => {
    res.status(401).json({ message: "Session required" });
  };
}
```

#### 🎯 controller.ts — use injected context and services

```ts
import { Controller, IRequestHandler } from "@stexcore/api-engine";

export default class PublishController extends Controller {
  public POST: IRequestHandler = (req, res) => {
    const user = req.context.user;
    const { title, content } = req.body;
    res.json({ ok: true, author: user.id, title, content });
  };
}
```

#### ⚙️ parser.service.ts

```ts
import { Service } from "@stexcore/api-engine";

export default class ParserService extends Service {
  parseCustom(raw: string) {
    // Parse your custom format into JSON
    return JSON.parse(raw.replace(/&/g, ",").replace(/=/g, ":"));
  }
}
```

---

### 🧠 Highlights

| Feature                    | Where it happens                       |
|----------------------------|----------------------------------------|
| Pre-validation parsing     | `pipe.ts`                             |
| Joi validation rules       | `schema.ts`                           |
| Session auth + guard       | `middleware.ts`                       |
| DI usage in all modules    | `this.$(Service)` everywhere          |
| Strict separation of logic | Services do the work, modules stay clean |

---

Want to go further? Combine Pipes with headers-only schemas, service-to-service injection, or custom error mappers.

You’ve got the pieces. Now assemble with purpose. 🔧

---

## 🌐 Full Example: Building an API

Here's a full-fledged example of how to structure a complete API project using `@stexcore/api-engine`. This includes:

- Directory layout
- Typical entry point
- Lifecycle breakdown
- Fully wired modules: services, controllers, schema, middlewares, pipes

Use this as a reference to scaffold your next project.

---

### 🗂 Project Structure (Tree Mode)

```
src/
├── index.ts
├── config.ts
├── services/
│   ├── auth.service.ts
│   ├── user.service.ts
│   └── logger.service.ts
├── app/
│   └── auth/
│       └── login/
│           ├── controller.ts
│           ├── schema.ts
│           └── pipe.ts
│
│   └── user/
│       └── [id]/
│           ├── controller.ts
│           └── middleware.ts
```

---

### 🔄 Lifecycle Flow

1. `index.ts` creates and initializes the server.
2. `initialize()` loads services in dependency order.
3. Then pipes → schemas → middlewares → controllers.
4. Errors are auto-forwarded to per-route or global middleware.
5. App is ready to receive traffic.

---

### ⚙️ index.ts

```ts
import { createServer } from "@stexcore/api-engine";
import config from "./config";

// Build and start
const server = createServer(config);

async function start() {
  try {
    await server.initialize(); // Load all modules
    const app = await server.listen(3000);
    console.log("API running on http://localhost:3000");

    // Optional cleanup
    process.on("SIGINT", () => {
      console.log("Shutting down...");
      server.destroy(); // Triggers destroy() on services
      process.exit();
    });
  } catch (err) {
    console.error("Startup failed:", err);
  }
}

start();
```

---

### 📌 Example Modules

#### auth.service.ts

```ts
import { Service } from "@stexcore/api-engine";

export default class AuthService extends Service {
  private tokens = new Set<string>();

  public initialize() {
    this.tokens.add("test-token");
  }

  login(u: string, p: string) {
    const token = "test-token";
    this.tokens.add(token);
    return token;
  }

  isValid(token: string) {
    return this.tokens.has(token);
  }
}
```

#### login/controller.ts

```ts
import { Controller } from "@stexcore/api-engine";

export default class LoginController extends Controller {
  auth = this.$(AuthService);

  public POST = (req, res) => {
    const token = this.auth.login(req.body.username, req.body.password);
    res.json({ token });
  };
}
```

#### user/[id]/controller.ts

```ts
import { Controller } from "@stexcore/api-engine";

export default class UserController extends Controller {
  public GET = (req, res) => {
    res.json({ id: req.params.id, name: "John Doe" });
  };
}
```

#### user/[id]/middleware.ts

```ts
import { Middleware } from "@stexcore/api-engine";

export default class AuthMiddleware extends Middleware {
  public handler = (req, _res, next) => {
    const token = req.headers["authorization"];
    if (token !== "test-token") return next(new Error("Unauthorized"));
    next();
  };

  public errors = (err, _req, res, _next) => {
    res.status(401).json({ message: "Access denied" });
  };
}
```

---

### 📊 Summary

| Concept        | Files Involved                       |
|----------------|--------------------------------------|
| Lifecycle      | `initialize()`, `destroy()`        |
| DI (Service)   | `this.$(Service)` in all modules    |
| Error Handling | `errors()` in middleware            |
| Flow           | Pipe → Schema → Middleware → Handler |

This structure is scalable, predictable, and plug-in friendly. You’re free to grow your API across domains without sacrificing clarity or control.

---

## 🔍 Advanced Configuration

While `@stexcore/api-engine` uses sensible defaults, you still have a few configuration knobs available when calling `createServer(config)`.

Here's a breakdown of the available options in `IServerConfig`:

---

### ⚙️ Interface

```ts
export interface IServerConfig {
  /**
   * Server Port
   */
  port: number;

  /**
   * Working directory (usually `__dirname`)
   */
  workdir: string;

  /**
   * Load mode for module resolution
   */
  mode?: "compact" | "tree";
}
```

---

### 🔧 Description

| Field     | Required | Type                 | Description                                                              |
|-----------|----------|----------------------|--------------------------------------------------------------------------|
| `port`     | ✅       | `number`             | Port where the server will listen after `.listen()`                     |
| `workdir`  | ✅       | `string`             | Absolute path used as base to resolve app/services (usually `__dirname`) |
| `mode`     | ❌       | `"compact" | "tree"` | Controls module discovery layout: compact = file-named paths, tree = folder routes |

---

### 📁 Example Usage

```ts
import { createServer } from "@stexcore/api-engine";

const server = createServer({
  port: 3000,
  workdir: __dirname,
  mode: "tree", // Optional, "tree" or "compact"
});

await server.initialize();
```

---

This clean config is all you need to bootstrap a powerful, modular API — no extra ceremony required.

---

## 🛠️ Development

If you plan to contribute to `@stexcore/api-engine` or just explore the source locally, here’s how to work with it.

---

### 📦 Install & Run

```bash
git clone https://github.com/stexcore/api-engine.git
cd api-engine
npm install
```

---

### 🔨 Build

Compiles `src/` into `dist/`:

```bash
npm run build
```

Uses plain `tsc` — no bundlers, just TypeScript.

---

### 🧪 Test

Basic test entrypoint:

```bash
npm test
```

This runs:  
`ts-node ./test/test.ts`

Use it to validate behavior or spin up dev scenarios.

---

### 🔁 Dev Tip

You can symlink this repo into a local project:

```bash
npm link
cd ../your-api
npm link @stexcore/api-engine
```

This allows live testing while developing the engine itself.

---

### 🗃️ File Structure

| Path         | Purpose                            |
|--------------|------------------------------------|
| `src/`        | Engine source code                |
| `test/`       | Basic test entrypoint             |
| `dist/`       | Build output after `npm run build` |

---

Keep it simple. Keep it fast. Keep it hackable.

---

## 📝 License

`@stexcore/api-engine` is licensed under the **MIT License**.

This means:

- ✅ You can use it freely in personal, commercial, or open-source projects.
- ✅ You can modify, distribute, or fork it as needed.
- ⚠️ Just keep the original copyright.

---

Respect the craft, honor the license, and go build something extraordinary. 🚀