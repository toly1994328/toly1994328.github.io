---
title: "Mitt 源码解析 v1 - 简单提示词"
description: "Mitt 源码解析：200 字节的事件发射器是如何炼成的"
date: 2026-06-10
tags: ["skills", "分享", "AIGC", "源码解析"]
category: "AIGC"
---

# Mitt 源码解析：200 字节的事件发射器是如何炼成的

## 前言

在前端开发中，事件系统无处不在——组件通信、状态管理、插件机制，都离不开发布/订阅模式。市面上有很多事件库，但 [mitt](https://github.com/developit/mitt) 以其极致的体积（gzip 后仅约 200 字节）和简洁的设计脱颖而出。

本文将深入 mitt v3.0.1 的源码，逐行解析其实现原理，探讨它在 TypeScript 类型系统上的精巧设计，以及我们能从中学到的编程思想。

## 一、整体架构一览

mitt 的全部源码只有一个文件 `src/index.ts`，核心代码不到 50 行。它导出一个工厂函数 `mitt()`，调用后返回一个 emitter 对象，具备三个方法：

| 方法 | 作用 |
|------|------|
| `on(type, handler)` | 注册事件监听器 |
| `off(type, handler?)` | 移除事件监听器 |
| `emit(type, event?)` | 触发事件 |

此外，还暴露了一个 `all` 属性，即存储所有事件处理函数的 `Map`。

这个设计体现了一个核心理念：**函数式风格，方法不依赖 `this`**。你可以安全地解构使用：

```ts
const { on, off, emit } = mitt()
```

## 二、TypeScript 类型设计

mitt 的类型系统是它最值得学习的部分之一。我们先看类型定义：

### 2.1 基础类型

```ts
export type EventType = string | symbol;

export type Handler<T = unknown> = (event: T) => void;
export type WildcardHandler<T = Record<string, unknown>> = (
  type: keyof T,
  event: T[keyof T]
) => void;
```

几个要点：

- **EventType** 支持 `string | symbol`，兼容 ES6 Symbol 作为事件名的场景。
- **Handler** 是普通事件处理函数，接收事件数据。
- **WildcardHandler** 是通配符 `*` 的处理函数，额外接收事件类型参数，方便在一个处理函数中区分不同事件。

### 2.2 事件映射类型

```ts
export type EventHandlerMap<Events extends Record<EventType, unknown>> = Map<
  keyof Events | '*',
  EventHandlerList<Events[keyof Events]> | WildCardEventHandlerList<Events>
>;
```

这里使用了 TypeScript 的 **泛型约束** + **映射类型**，让事件名和事件数据在类型层面形成绑定关系。

### 2.3 Emitter 接口与方法重载

```ts
export interface Emitter<Events extends Record<EventType, unknown>> {
  all: EventHandlerMap<Events>;

  on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void;
  on(type: '*', handler: WildcardHandler<Events>): void;

  off<Key extends keyof Events>(type: Key, handler?: Handler<Events[Key]>): void;
  off(type: '*', handler: WildcardHandler<Events>): void;

  emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
  emit<Key extends keyof Events>(
    type: undefined extends Events[Key] ? Key : never
  ): void;
}
```

**方法重载**是这里的精华：

1. `on` / `off` 分别为普通事件和通配符 `*` 提供了两个重载签名，确保通配符处理函数获得正确的类型推断。
2. `emit` 的第二个重载使用了条件类型 `undefined extends Events[Key] ? Key : never`——这意味着如果事件数据类型包含 `undefined`（即可选），可以省略第二个参数；否则必须传入。

来看实际效果：

```ts
type Events = {
  foo: string;      // 必须传数据
  bar?: number;     // 数据可选
};

const emitter = mitt<Events>();

emitter.emit('foo', 'hello');  // ✅
emitter.emit('foo');           // ❌ 编译报错，foo 要求传 string
emitter.emit('bar');           // ✅ bar 的数据是可选的
emitter.emit('bar', 42);      // ✅
```

这种设计让 mitt 在纯 JavaScript 使用时零门槛，在 TypeScript 中则提供完备的类型安全。

## 三、核心实现逐行解析

### 3.1 工厂函数

```ts
export default function mitt<Events extends Record<EventType, unknown>>(
  all?: EventHandlerMap<Events>
): Emitter<Events> {
  type GenericEventHandler =
    | Handler<Events[keyof Events]>
    | WildcardHandler<Events>;
  all = all || new Map();

  return { all, on, off, emit };
}
```

- 支持传入已有的 `Map` 作为初始事件表（适用于需要预注册事件或恢复状态的场景）。
- 内部定义了 `GenericEventHandler` 联合类型，统一处理普通和通配符两种 handler。
- 不传参时默认创建空 `Map`。

### 3.2 on —— 注册事件

```ts
on<Key extends keyof Events>(type: Key, handler: GenericEventHandler) {
  const handlers: Array<GenericEventHandler> | undefined = all!.get(type);
  if (handlers) {
    handlers.push(handler);
  } else {
    all!.set(type, [handler] as EventHandlerList<Events[keyof Events]>);
  }
}
```

逻辑非常简洁：
1. 从 Map 中获取该类型的 handler 数组。
2. 若已存在，直接 `push`。
3. 若不存在，创建新数组。

值得注意的是，**mitt 允许重复注册同一个 handler**，行为与 Node.js EventEmitter 一致——注册几次就触发几次。

### 3.3 off —— 移除事件

```ts
off<Key extends keyof Events>(type: Key, handler?: GenericEventHandler) {
  const handlers: Array<GenericEventHandler> | undefined = all!.get(type);
  if (handlers) {
    if (handler) {
      handlers.splice(handlers.indexOf(handler) >>> 0, 1);
    } else {
      all!.set(type, []);
    }
  }
}
```

这段代码有几个巧妙之处：

**1. `handler` 为可选参数**

不传 handler 时，清空该类型的所有监听器（设为空数组而非删除键，保持 Map 结构稳定）。

**2. `>>> 0` 位运算技巧**

这是全文最精巧的一行代码。`indexOf` 在找不到元素时返回 `-1`，而 `-1 >>> 0`（无符号右移 0 位）会变成 `4294967295`（即 `2^32 - 1`）。对一个通常很短的数组调用 `splice(4294967295, 1)` 实际上不会删除任何元素——因为该索引远超数组长度。

这相当于一行代码替代了：

```ts
const idx = handlers.indexOf(handler);
if (idx > -1) {
  handlers.splice(idx, 1);
}
```

用位运算节省了一个分支判断，极致压缩体积。

### 3.4 emit —— 触发事件

```ts
emit<Key extends keyof Events>(type: Key, evt?: Events[Key]) {
  let handlers = all!.get(type);
  if (handlers) {
    (handlers as EventHandlerList<Events[keyof Events]>)
      .slice()
      .map((handler) => {
        handler(evt!);
      });
  }

  handlers = all!.get('*');
  if (handlers) {
    (handlers as WildCardEventHandlerList<Events>)
      .slice()
      .map((handler) => {
        handler(type, evt!);
      });
  }
}
```

几个设计决策：

**1. `.slice()` 创建副本**

在遍历前先复制数组。这确保了在 handler 内部调用 `on` 或 `off` 修改监听器列表时，当前的触发流程不会受影响。这是事件系统中经典的 **迭代安全** 处理。

**2. 用 `.map()` 代替 `.forEach()`**

功能上等价，但 `.map` 在 minify 后字符更少（`map` 3 字符 vs `forEach` 7 字符），再次体现了 mitt 对体积的极致追求。

**3. 通配符 `*` 后触发**

先执行精确匹配的 handler，再执行通配符 handler，通配符 handler 会额外收到事件类型作为第一个参数。这使得通配符非常适合做日志、调试或统一的事件拦截。

## 四、数据结构选择：为什么用 Map

mitt 使用 ES6 `Map` 而非普通对象来存储事件映射，原因包括：

1. **支持 Symbol 作为键**：普通对象的键只能是 string，Map 原生支持 Symbol。
2. **无原型污染风险**：普通对象有 `constructor`、`toString` 等原型属性，如果事件名恰好是 `constructor`，使用对象会产生冲突。Map 没有这个问题。
3. **`clear()` 方法**：用户可以通过 `emitter.all.clear()` 一行代码清空所有事件，非常方便。

从测试代码中也能看到，mitt 明确测试了 `constructor` 作为事件名的场景，确保不受原型链干扰。

## 五、设计取舍与局限

mitt 的极简设计意味着它有意放弃了一些功能：

| 未实现的功能 | 说明 |
|---|---|
| once | 没有内置"只触发一次"的监听，需要用户自行在 handler 中 off |
| 优先级 | 监听器按注册顺序执行，不支持优先级排序 |
| 异步支持 | 不 await handler 的返回值，纯同步触发 |
| 错误隔离 | 某个 handler 抛异常会中断后续 handler 的执行 |
| 命名空间 | 不支持 `foo.bar` 样式的命名空间 |

这些取舍都是为了保持 200 字节的体积目标。如果项目需要这些功能，可以在 mitt 之上做简单封装。

## 六、实用模式

### 6.1 实现 once

```ts
function once<T>(emitter: Emitter<any>, type: string, handler: Handler<T>) {
  const wrapper = (evt: T) => {
    handler(evt);
    emitter.off(type, wrapper);
  };
  emitter.on(type, wrapper);
}
```

### 6.2 作为全局事件总线

```ts
// eventBus.ts
import mitt from 'mitt';

type AppEvents = {
  'user:login': { id: string; name: string };
  'user:logout': undefined;
  'notification': { message: string; level: 'info' | 'warn' | 'error' };
};

export const bus = mitt<AppEvents>();
```

```ts
// 任意组件中
import { bus } from './eventBus';

bus.on('user:login', (user) => {
  console.log(`${user.name} logged in`);
});

bus.emit('user:login', { id: '1', name: 'Alice' });
```

### 6.3 配合 React/Vue 跨组件通信

mitt 常作为轻量级事件总线用于框架中的跨层通信，尤其适合不想引入全局状态管理库的小型项目。

## 七、从 mitt 中学到的工程思想

1. **约束即自由**：200 字节的预算迫使每一行代码都经过深思熟虑，`>>> 0`、`.map` 替代 `.forEach`、`.slice()` 防御性拷贝，都是在极限约束下的精妙选择。

2. **类型即文档**：mitt 的 TypeScript 类型设计本身就是最好的 API 文档——编辑器会告诉你哪些事件存在、需要什么参数、handler 期望什么类型。

3. **暴露内部结构**：`all` 属性直接暴露给用户，看似违反封装原则，实则提供了极大的灵活性——清空、遍历、序列化、调试，都因此变得简单。这在库足够小、心智模型足够清晰时是合理的。

4. **函数式优于类式**：不使用 class，方法不依赖 `this`，让 mitt 可以安全地被解构、传递、组合，天然适配函数式编程风格。

## 八、总结

mitt 是"少即是多"哲学的绝佳实践。在约 200 字节的空间里，它提供了：

- 完整的事件发布/订阅功能
- 通配符监听
- 完备的 TypeScript 类型推断
- 零依赖、跨平台

阅读 mitt 的源码，与其说是学习一个事件库的实现，不如说是学习如何在极致约束下做出优雅的工程决策。这种能力，在日常开发中同样适用——无论你在写一个工具函数还是一个大型系统。

---

> 本文基于 mitt v3.0.1 源码分析，仓库地址：[https://github.com/developit/mitt](https://github.com/developit/mitt)
