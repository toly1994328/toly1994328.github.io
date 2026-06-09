---
title: "Flutter Widget 体系概览"
description: "从整体视角理解 Flutter 的 Widget 树、Element 树和 RenderObject 树。"
date: 2024-06-09
tags: ["Flutter", "Widget", "架构"]
category: "Flutter"
---

## Widget 是什么

在 Flutter 中，一切皆 Widget。Widget 是 UI 的不可变描述，它定义了界面应该长什么样。

## 三棵树

Flutter 的渲染体系由三棵树组成：

1. **Widget Tree** — UI 的配置描述
2. **Element Tree** — Widget 的实例化，管理生命周期
3. **RenderObject Tree** — 实际负责布局和绘制

```dart
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(16),
      child: Text('Hello, Flutter!'),
    );
  }
}
```

理解这三棵树的关系，是深入 Flutter 的基础。
